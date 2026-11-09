// The app's one energy meter (energy.ts): its samples wait with the timings and go to the laptop with them.
import { energyMeter } from './energy';
import { timing } from './timings';

export const meter = energyMeter((sample) => timing.energy(sample));
