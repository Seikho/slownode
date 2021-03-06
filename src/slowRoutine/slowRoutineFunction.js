var assert = require('assert');
var esprima = require('esprima');
var escodegen = require('escodegen');
var traverse = require('./traverse');
var rewriteBodyAST = require('./rewriteBodyAST');
var match = require('./match');
//---------------------------------------------
// TODO: doc all this in README...
// Rules for SlowRoutine bodies:
// - ensure the assumption of a *single* scope for identifiers within the function body is strictly met:
//   - ensure function contains no closures (ie inner functions or lambdas)
//   - ensure exception identifier names in catch blocks are disjoint with all other identifier names in the function
//     - note: these ids are scoped only to the catch block. This check allows them to be treated like all other local vars
//   - ensure all variable declarations are 'var' (ie not 'let' or 'const' except as per below rules)
//
// - ensure the function is a pure function of it inputs:
//   - all identifiers referenced are either:
//     - parameters of the function
//     - locally declared variables or labels
//     - whitelisted globals and 'ambients' ('arguments', 'require', 'Infinity', 'parseInt', what else...?)
//     - locally declared 'const' identifiers whose rhs is considered 'safe and idempotent' (as in the HTTP-method sense)
//       - TODO: rules for 'safe and idempotent'...
// NB: no need to check for syntactic validity, since the function must be syntactically valid to have been passed in here.
// NB: either a normal function or generator function can be passed in - it makes no difference (doc why to do this (hint: yield keyword available in gens))
//---------------------------------------------
/** Creates an instance of SlowRoutineFunction. */
var SlowRoutineFunction = (function (bodyFunction, options) {
    // Validate arguments.
    assert(typeof bodyFunction === 'function');
    options = options || { yieldIdentifier: null, constIdentifier: null };
    // Transform original function --> source code --> AST.
    var originalFunction = bodyFunction;
    var originalSource = '(' + originalFunction.toString() + ')';
    var originalAST = esprima.parse(originalSource);
    var exprStmt = originalAST.body[0];
    var funcExpr = exprStmt.expression;
    // Convert direct calls to options.yieldIdentifier to equivalent yield expressions.
    if (options.yieldIdentifier)
        replaceYieldIdentifierCallsWithYieldExpressions(funcExpr, options.yieldIdentifier);
    // Convert variable declarations whose 'init' is a direct call to options.constIdentifier to equivalent const declarations.
    if (options.constIdentifier)
        replaceConstIdentifierCallsWithConstDeclarations(funcExpr, options.constIdentifier);
    // Remove all const declarations from the function body.
    var constDecls = extractConstDeclarators(funcExpr);
    // Compile information about all 'ambient' variables.
    // This include all properties of the global object, plus all const declarations from the body function.
    var ambientNames = [].concat('require', Object.getOwnPropertyNames(global), constDecls.map(function (decl) { return decl.id['name']; }));
    var ambientFactory = makeAmbientFactoryFunction(constDecls);
    // Validate the AST.
    ensureOnlySupportedConstructsInBody(funcExpr, ambientNames);
    ensureIdentifierNamesAreValid(funcExpr);
    ensureAllIdentifierReferencesAreKnownLocalsOrAmbients(funcExpr, ambientNames);
    ensureAmbientIdentifiersAreNotMutated(funcExpr, ambientNames);
    // Rewrite the AST in a form suitable for serialization/deserialization.
    var bodyAST = rewriteBodyAST(funcExpr, ambientNames);
    // Transform modified AST --> source code --> function.
    var bodySource = '(' + escodegen.generate(bodyAST) + ')';
    var bodyFunc = eval(bodySource);
    // Generate and return a SlowRoutineFunction instance (ie a callable that returns a SlowRoutine).
    assert(funcExpr.params.every(function (p) { return p.type === 'Identifier'; }));
    var paramNames = funcExpr.params.map(function (p) { return p['name']; });
    var result = makeSlowRoutineFunction(bodyFunc, paramNames, ambientFactory);
    return result;
});
/** In the given AST, converts direct calls to `yieldIdentifier` to equivalent yield expressions */
function replaceYieldIdentifierCallsWithYieldExpressions(funcExpr, yieldIdentifier) {
    traverse(funcExpr.body, function (node) {
        match(node, {
            CallExpression: function (expr) {
                if (expr.callee.type !== 'Identifier')
                    return;
                if (expr.callee['name'] !== yieldIdentifier)
                    return;
                var args = expr.arguments;
                if (args.length > 1)
                    throw new Error("SlowRoutine: yield accepts at most one argument; " + args.length + " supplied");
                // Replace the CallExpression with a YieldExpression.
                Object.keys(expr).forEach(function (key) { return delete expr[key]; });
                expr.type = 'YieldExpression';
                if (args.length === 1)
                    expr['argument'] = args[0];
            },
            Otherwise: function (node) { }
        });
    });
}
/** In the given AST, converts variable declarations whose 'init' is a direct call to `constIdentifier` to equivalent const declarations. */
function replaceConstIdentifierCallsWithConstDeclarations(funcExpr, constIdentifier) {
    traverse(funcExpr.body, function (node) {
        match(node, {
            VariableDeclaration: function (stmt) {
                if (stmt.kind !== 'var')
                    return;
                var constDeclarators = stmt.declarations.filter(isConstMarkedDeclarator);
                if (constDeclarators.length > 0 && constDeclarators.length < stmt.declarations.length) {
                    throw new Error('SlowRoutine: cannot mix const and var declarators in a single declaration');
                }
                if (constDeclarators.length > 0) {
                    stmt.kind = 'const';
                    stmt.declarations.forEach(function (decl) { return decl.init = decl.init['arguments'][0]; });
                }
            },
            Otherwise: function (node) { }
        });
    });
    function isConstMarkedDeclarator(decl) {
        if (!decl.init || decl.init.type !== 'CallExpression')
            return false;
        var callExpr = decl.init;
        if (callExpr.callee.type !== 'Identifier')
            return false;
        if (callExpr.callee['name'] !== constIdentifier)
            return false;
        var args = callExpr.arguments;
        if (args.length > 1)
            throw new Error("SlowRoutine: " + constIdentifier + " must have one argument; " + args.length + " supplied");
        return true;
    }
}
/** Removes all const declarations from the given AST, and return an array of all the removed declarators. */
function extractConstDeclarators(funcExpr) {
    var result = [];
    traverse(funcExpr.body, function (node) {
        match(node, {
            VariableDeclaration: function (stmt) {
                if (stmt.kind !== 'const')
                    return;
                result = result.concat(stmt.declarations);
                Object.keys(stmt).forEach(function (key) { return delete stmt[key]; });
                stmt.type = 'EmptyStatement';
            },
            Otherwise: function (node) { }
        });
    });
    return result;
}
/** Returns a function that returns the $ambient object, based on the given declarators and on the global object. */
function makeAmbientFactoryFunction(constDecls) {
    var bodySource = "\n        " + constDecls.map(function (decl) { return ("var " + decl.id['name'] + " = " + escodegen.generate(decl.init) + ";"); }).join('\n') + "\n        var $ambient = Object.create(global);\n        $ambient.require = require.main.require;\n        " + constDecls.map(function (decl) { return ("$ambient." + decl.id['name'] + " = " + decl.id['name'] + ";"); }).join('\n') + "\n        return $ambient;\n    ";
    var factoryFunc = eval('(function () {\n' + bodySource + '\n})');
    return factoryFunc;
}
/**
 * Traverses the AST, throwing an error if any unsupported constructs are encountered.
 * Constructs may be unsupported for two main reasons:
 * (1) they violate the assumptions on which SlowRoutines depend, in particular the single-scoped-body assumption.
 * (2) they have not been implemented yet (destructuring, for..of, and some other ES6+ constructs).
 */
function ensureOnlySupportedConstructsInBody(funcExpr, ambientIds) {
    var whitelistedNodeTypes = [
        'EmptyStatement', 'BlockStatement', 'ExpressionStatement', 'IfStatement', 'SwitchStatement',
        'WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForInStatement', 'TryStatement',
        'LabeledStatement', 'BreakStatement', 'ContinueStatement', 'ReturnStatement', 'ThrowStatement',
        'VariableDeclaration', 'SequenceExpression', 'YieldExpression', 'AssignmentExpression', 'ConditionalExpression',
        'LogicalExpression', 'BinaryExpression', 'UnaryExpression', 'UpdateExpression', 'CallExpression',
        'NewExpression', 'MemberExpression', 'ArrayExpression', 'ObjectExpression', 'Identifier',
        'TemplateLiteral', 'RegexLiteral', 'Literal'
    ];
    // Rule out non-whitelisted node types, and block-scoped variable declarations.
    traverse(funcExpr.body, function (node) {
        var whitelisted = whitelistedNodeTypes.indexOf(node.type) !== -1;
        whitelisted = whitelisted && (node.type !== 'VariableDeclaration' || node['kind'] === 'var');
        if (whitelisted)
            return;
        switch (node.type) {
            case 'VariableDeclaration':
                throw new Error("SlowRoutine: block-scoped variable declarations are not allowed within the body function");
            case 'FunctionDeclaration':
            case 'FunctionExpression':
            case 'ArrowFunctionExpression':
                throw new Error("SlowRoutine: function delcarations, function expressions and arrow functions are not allowed within the body function");
            default:
                throw new Error("SlowRoutine: construct '" + node.type + "' is not allowed within the body function");
        }
    });
    // Rule out catch block exception identifiers that shadow or are shadowed by any other identifier.
    var localIds = funcExpr.params.map(function (p) { return p['name']; });
    var catchIds = [];
    traverse(funcExpr.body, function (node) {
        match(node, {
            VariableDeclaration: function (stmt) { localIds = localIds.concat(node['declarations'].map(function (decl) { return decl.id.name; })); },
            TryStatement: function (stmt) { if (stmt.handler)
                catchIds.push(stmt.handler.param['name']); },
            Otherwise: function (node) { }
        });
    });
    catchIds.forEach(function (name, i) {
        var otherCatchIds = [].concat(catchIds.slice(0, i), catchIds.slice(i + 1));
        if (ambientIds.indexOf(name) === -1 && localIds.indexOf(name) === -1 && otherCatchIds.indexOf(name) === -1)
            return;
        throw new Error("SlowRoutine: exception identifier '" + name + "' shadows or is shadowed by another local or ambient identifier");
    });
}
/** Traverses the AST and throws an error if an identifier is encountered that contains exotic characters or is called '$' or '$ambient'. */
function ensureIdentifierNamesAreValid(funcExpr) {
    traverse(funcExpr.body, function (node) {
        return match(node, {
            Identifier: function (expr) {
                if (expr.name !== '$' && expr.name !== '$ambient' && /^[a-zA-Z$_][a-zA-Z$_0-9]*$/.test(expr.name))
                    return;
                throw new Error("SlowRoutine: invalid or disallowed identifier name '" + expr.name + "'");
            },
            Otherwise: function (node) { }
        });
    });
}
/** Traverses the AST, throwing an error if an unqualified identifier name is neither a local nor an ambient variable name. */
function ensureAllIdentifierReferencesAreKnownLocalsOrAmbients(funcExpr, ambientIds) {
    // Collate all known identifiers, including ambients, locals, and catch block exception identifiers.
    var knownIds = ambientIds.concat(funcExpr.params.map(function (p) { return p['name']; }));
    traverse(funcExpr.body, function (node) {
        match(node, {
            VariableDeclaration: function (stmt) { knownIds = knownIds.concat(node['declarations'].map(function (decl) { return decl.id.name; })); },
            TryStatement: function (stmt) { if (stmt.handler)
                knownIds.push(stmt.handler.param['name']); },
            Otherwise: function (node) { }
        });
    });
    // Ensure all identifier references are to known ids.
    traverse(funcExpr.body, function (node) {
        return match(node, {
            // Ignore the label identifier and continue checking the body.
            LabeledStatement: function (stmt) { return stmt.body; },
            // Ignore the property identifier (if any) and continue checking the object.
            MemberExpression: function (expr) { return expr.computed ? void 0 : expr.object; },
            // Ignore key identifiers (if any) but check everything else.
            ObjectExpression: function (expr) {
                var computedKeyExprs = expr.properties.filter(function (p) { return p.computed; }).map(function (p) { return p.key; });
                var valueExprs = expr.properties.map(function (p) { return p.value; });
                return { type: 'ArrayExpression', elements: computedKeyExprs.concat(valueExprs) };
            },
            Identifier: function (expr) {
                if (knownIds.indexOf(expr.name) !== -1)
                    return;
                throw new Error("SlowRoutine: reference to unknown identifier '" + expr.name + "'");
            },
            Otherwise: function (node) { }
        });
    });
}
/** Traverses the AST, throwing an error if any construct mutates an ambient variable. */
function ensureAmbientIdentifiersAreNotMutated(funcExpr, ambientIds) {
    // Ensure all identifier references are to known ids.
    traverse(funcExpr.body, function (node) {
        return match(node, {
            AssignmentExpression: function (expr) {
                if (expr.left.type !== 'Identifier')
                    return;
                var name = expr.left['name'];
                if (ambientIds.indexOf(name) === -1)
                    return;
                throw new Error("SlowRoutine: cannot mutate ambient identifier '" + name + "'");
            },
            UpdateExpression: function (expr) {
                if (expr.argument.type !== 'Identifier')
                    return;
                var name = expr.argument['name'];
                if (ambientIds.indexOf(name) === -1)
                    return;
                throw new Error("SlowRoutine: cannot mutate ambient identifier '" + name + "'");
            },
            Otherwise: function (node) { }
        });
    });
}
/** Constructs a SlowRoutineFunction instance tailored to the given body code and parameter names. */
function makeSlowRoutineFunction(bodyFunc, paramNames, ambientFactory) {
    // This is the generic constructor function. It closes over bodyFunc and ambientFactory.
    function SlowRoutineFunction() {
        var $ambient = ambientFactory();
        var inst = {
            _ambientFactory: ambientFactory,
            _body: bodyFunc,
            _state: { local: { arguments: Array.prototype.slice.call(arguments) } }
        };
        ['next', 'throw', 'return'].forEach(function (method) {
            inst[method] = function (value) {
                inst._state.incoming = { type: method === 'next' ? 'yield' : method, value: value };
                inst._body(inst._state, $ambient);
                if (inst._state.outgoing.type === 'throw')
                    throw inst._state.outgoing.value;
                return { done: inst._state.outgoing.type === 'return', value: inst._state.outgoing.value };
            };
        });
        return inst;
    }
    // Customise the generic constructor function to have the same parameters/arity as the supplied bodyFunc.
    var originalSource = SlowRoutineFunction.toString();
    var sourceWithParamNames = originalSource.replace('SlowRoutineFunction()', "SlowRoutineFunction(" + paramNames.join(', ') + ")");
    var constructorFunction = eval('(' + sourceWithParamNames + ')');
    // Return the customised constructor function.
    return constructorFunction;
}
module.exports = SlowRoutineFunction;
//# sourceMappingURL=slowRoutineFunction.js.map