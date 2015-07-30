/// <reference path="../knex/knex.d.ts" />
/// <reference path="../node/node.d.ts" />

declare module "slownode" {
	import Knex = require("knex");
	
	export function setTimeout(func: SlowFunction, milliseconds: number): Promise<number>;
	export function setImmediate(func: SlowFunction): Promise<number>;
	export function setInterval(funct: SlowFunction, milliseconds: number): Promise<number>; 
	
	export interface SlowNodeStatic {
		EventEmitter: any;
	}
	
	export class SlowEventEmitter {
		
	}
	
	export class SlowEventLoop {
		
		constructor(config: EventLoopConfig);
		config: EventLoopConfig;
		store: Knex;
		flushCallback: NodeJS.Timer;
		
		start(): void;
		stop(): void;
		
		storeCall(operation: SlowFunction): any;
		getNextCall(): Promise<SlowFunction>;
		processCall(task?: SlowFunction): Promise<boolean>
		removeCall(task: SlowFunction): any;
	}
	
	export interface SlowFunction {
		id?: number;
		functionId: string;
		runAt?: number;
		arguments: any;
	}
	
	export interface Subscriber {
		id: string;
		callback: (args: any) => Promise<any>;
	}
	
	export interface EventSchema {
		id?: number;
		runAt: number;
		runAtReadable: string;
		eventName: string;
		event: string;
	}
	
	export interface EventLoopConfig {
		retryCount?: number;
		retryIntervalMs?: number;
		pollIntervalMs?: number;
		database: string;
	}
}