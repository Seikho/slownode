var match = require('./match');
// TODO: temp testing... depth-first preorder
function traverse(node, action) {
    // TODO: ...
    var actionResult = action(node);
    if (actionResult === false)
        return; // break traversal immediately
    if (actionResult && actionResult.type) {
        // continue traversing on returned replacement node
        traverse(actionResult, action);
        return;
    }
    // TODO: ...
    match(node, {
        EmptyStatement: function (stmt) { },
        BlockStatement: function (stmt) { return stmt.body.forEach(function (stmt) { return traverse(stmt, action); }); },
        ExpressionStatement: function (stmt) { return traverse(stmt.expression, action); },
        IfStatement: function (stmt) {
            traverse(stmt.test, action);
            traverse(stmt.consequent, action);
            if (stmt.alternate)
                traverse(stmt.alternate, action);
        },
        SwitchStatement: function (stmt) {
            traverse(stmt.discriminant, action);
            stmt.cases.forEach(function (switchCase) {
                traverse(switchCase.test, action);
                switchCase.consequent.forEach(function (stmt) { return traverse(stmt, action); });
            });
        },
        WhileStatement: function (stmt) {
            traverse(stmt.test, action);
            traverse(stmt.body, action);
        },
        DoWhileStatement: function (stmt) {
            traverse(stmt.body, action);
            traverse(stmt.test, action);
        },
        ForStatement: function (stmt) {
            if (stmt.init)
                traverse(stmt.init, action);
            if (stmt.test)
                traverse(stmt.test, action);
            if (stmt.update)
                traverse(stmt.update, action);
            traverse(stmt.body, action);
        },
        ForInStatement: function (stmt) {
            traverse(stmt.left, action);
            traverse(stmt.right, action);
            traverse(stmt.body, action);
        },
        TryStatement: function (stmt) {
            traverse(stmt.block, action);
            if (stmt.handler) {
                traverse(stmt.handler.param, action);
                traverse(stmt.handler.body, action);
            }
            if (stmt.finalizer)
                traverse(stmt.finalizer, action);
        },
        LabeledStatement: function (stmt) {
            traverse(stmt.label, action);
            traverse(stmt.body, action);
        },
        BreakStatement: function (stmt) { return stmt.label && traverse(stmt.label, action); },
        ContinueStatement: function (stmt) { return stmt.label && traverse(stmt.label, action); },
        ReturnStatement: function (stmt) { return stmt.argument && traverse(stmt.argument, action); },
        ThrowStatement: function (stmt) { return traverse(stmt.argument, action); },
        VariableDeclaration: function (stmt) {
            stmt.declarations.forEach(function (decl) {
                traverse(decl.id, action);
                if (decl.init)
                    traverse(decl.init, action);
            });
        },
        SequenceExpression: function (expr) { return expr.expressions.forEach(function (expr) { return traverse(expr, action); }); },
        AssignmentExpression: function (expr) {
            traverse(expr.left, action);
            traverse(expr.right, action);
        },
        ConditionalExpression: function (expr) {
            traverse(expr.test, action);
            traverse(expr.consequent, action);
            traverse(expr.alternate, action);
        },
        LogicalExpression: function (expr) {
            traverse(expr.left, action);
            traverse(expr.right, action);
        },
        BinaryExpression: function (expr) {
            traverse(expr.left, action);
            traverse(expr.right, action);
        },
        UnaryExpression: function (expr) { return traverse(expr.argument, action); },
        UpdateExpression: function (expr) { return traverse(expr.argument, action); },
        CallExpression: function (expr) {
            traverse(expr.callee, action);
            expr.arguments.forEach(function (arg) { return traverse(arg, action); });
        },
        NewExpression: function (expr) {
            traverse(expr.callee, action);
            expr.arguments.forEach(function (arg) { return traverse(arg, action); });
        },
        MemberExpression: function (expr) {
            traverse(expr.object, action);
            traverse(expr.property, action);
        },
        ArrayExpression: function (expr) { return expr.elements.forEach(function (elem) { return traverse(elem, action); }); },
        ObjectExpression: function (expr) {
            expr.properties.forEach(function (prop) {
                traverse(prop.key, action);
                traverse(prop.value, action);
            });
        },
        Identifier: function (expr) { },
        TemplateLiteral: function (expr) { return expr.expressions.forEach(function (expr) { return traverse(expr, action); }); },
        Literal: function (expr) { },
        Otherwise: function (node) {
            throw new Error("slowfunc: unsupported node type: '" + node.type + "'");
        }
    });
}
module.exports = traverse;
//# sourceMappingURL=traverse.js.map