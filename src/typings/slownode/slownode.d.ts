/// <reference path="../knex/knex.d.ts" />
/// <reference path="../node/node.d.ts" />

declare module "slownode" {
	import Knex = require("knex");
	
	export interface SlowNodeStatic {
		EventLoop: any;
		EventEmitter: any;
	}
	
	export class SlowEventEmitter {
		
	}
	
	export class SlowEventLoop {
		
		constructor(config: EventLoopConfig);
		private config: EventLoopConfig;
		private store: Knex;
		private pollInterval: number;
		private subscribers: Array<Subscriber>;
		public ready: Promise<boolean>;
		private flushCallback: NodeJS.Timer;
		
		public start(): void;
		public stop(): void;
		
		public subscribe(subscriber: Subscriber): boolean;
		private removeSubscriber(subscriberId: string): boolean;
		
		public publish(task: Event): any;
		private getNextEvent(): Promise<Event>;
		private processEvent(task?: Event): Promise<boolean>
		private removeEvent(task: Event): any;
	}
	
	export interface Event {
		id: number;
		eventName: string;
		event: any;
		runAt: number;
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
		pollInterval?: number;
		database: string;
	}
}