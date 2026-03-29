export type MatchMode = 'autonomous' | 'driver' | 'disabled';

export class MatchProfile {
	name: string;
	phases: MatchPhase[];

	constructor(name: string, phases: MatchPhase[]) {
		this.name = name;
		this.phases = phases;
	}
}

export class MatchPhase {
	mode: MatchMode;
	duration: number; // seconds, 0 = infinite

	constructor(mode: MatchMode, duration: number) {
		this.mode = mode;
		this.duration = duration;
	}
}

export const defaultMatchProfiles = (): MatchProfile[] => [
	new MatchProfile('Regular', [
		new MatchPhase('disabled', 0),
		new MatchPhase('autonomous', 15),
		new MatchPhase('disabled', 0),
		new MatchPhase('driver', 105),
		new MatchPhase('disabled', 0)
	]),
	new MatchProfile('VEX U', [
		new MatchPhase('disabled', 0),
		new MatchPhase('autonomous', 45),
		new MatchPhase('disabled', 0),
		new MatchPhase('driver', 75),
		new MatchPhase('disabled', 0)
	]),
	new MatchProfile('Driver', [
		new MatchPhase('disabled', 0),
		new MatchPhase('driver', 60),
		new MatchPhase('disabled', 0)
	]),
	new MatchProfile('Auton', [
		new MatchPhase('disabled', 0),
		new MatchPhase('autonomous', 60),
		new MatchPhase('disabled', 0)
	])
];
