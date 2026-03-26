export const TimerStatus = {
	INIT: 'INIT',
	RUNNING: 'RUNNING',
	PAUSE: 'PAUSE',
	TIMESUP: 'TIMESUP'
} as const;

export type TimerStatusType = (typeof TimerStatus)[keyof typeof TimerStatus];

export class CountdownTimer {
	private _previousTicks: number = 0;
	private _startTick: number | null = null;
	private _totalTicks: number = 0;

	get isRunning(): boolean {
		return this.status === TimerStatus.RUNNING;
	}

	get isTimeup(): boolean {
		return this.status === TimerStatus.TIMESUP;
	}

	get status(): TimerStatusType {
		if (this._startTick == null && this._previousTicks === 0) return TimerStatus.INIT;
		if (this._startTick != null && this.remainingTicks !== 0) return TimerStatus.RUNNING;
		if (this._startTick == null && this._previousTicks !== 0) return TimerStatus.PAUSE;
		return TimerStatus.TIMESUP;
	}

	get remainingTicks(): number {
		if (this._startTick == null) {
			return Math.max(0, this._totalTicks - this._previousTicks);
		}
		return Math.max(0, this._totalTicks - this._previousTicks - (Date.now() - this._startTick));
	}

	get displayTicks(): number {
		return this.remainingTicks;
	}

	set(ms: number) {
		if (this.status === TimerStatus.PAUSE) {
			this._totalTicks = ms + 1;
			this._previousTicks = 1;
		} else {
			this._totalTicks = ms;
		}
	}

	start() {
		if (!this.isRunning && !this.isTimeup) {
			this._startTick = Date.now();
		}
	}

	stop() {
		if (this.isRunning && this._startTick != null) {
			this._previousTicks += Date.now() - this._startTick;
			this._startTick = null;
		}
	}

	reset() {
		this._startTick = null;
		this._previousTicks = 0;
		this._totalTicks = 0;
	}
}
