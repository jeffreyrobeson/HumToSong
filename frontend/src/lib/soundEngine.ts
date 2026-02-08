type WaveType = OscillatorType;

interface MaterialSound {
	waveform: WaveType;
	frequency: number;
	attack: number;
	decay: number;
	sustain: number;
	release: number;
}

const MATERIAL_SOUNDS: Record<string, MaterialSound> = {
	ceramic: {
		waveform: "sine",
		frequency: 523,
		attack: 0.01,
		decay: 0.15,
		sustain: 0.2,
		release: 0.3,
	},
	metal: {
		waveform: "sawtooth",
		frequency: 440,
		attack: 0.005,
		decay: 0.1,
		sustain: 0.4,
		release: 0.6,
	},
	wood: {
		waveform: "triangle",
		frequency: 330,
		attack: 0.005,
		decay: 0.08,
		sustain: 0.05,
		release: 0.1,
	},
	glass: {
		waveform: "sine",
		frequency: 880,
		attack: 0.002,
		decay: 0.05,
		sustain: 0.15,
		release: 0.4,
	},
	fabric: {
		waveform: "sine",
		frequency: 262,
		attack: 0.02,
		decay: 0.2,
		sustain: 0.3,
		release: 0.5,
	},
	plastic: {
		waveform: "square",
		frequency: 392,
		attack: 0.005,
		decay: 0.1,
		sustain: 0.15,
		release: 0.2,
	},
	organic: {
		waveform: "triangle",
		frequency: 349,
		attack: 0.01,
		decay: 0.15,
		sustain: 0.2,
		release: 0.3,
	},
};

const DEFAULT_SOUND: MaterialSound = {
	waveform: "sine",
	frequency: 440,
	attack: 0.01,
	decay: 0.1,
	sustain: 0.2,
	release: 0.3,
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
	if (!audioCtx) {
		audioCtx = new AudioContext();
	}
	if (audioCtx.state === "suspended") {
		audioCtx.resume();
	}
	return audioCtx;
}

/**
 * Play a synthesized sound based on object material.
 * Adds slight pitch randomization for organic feel.
 */
export function playMaterialSound(material: string): void {
	const ctx = getAudioContext();
	const config = MATERIAL_SOUNDS[material.toLowerCase()] ?? DEFAULT_SOUND;

	const now = ctx.currentTime;
	const pitchVariation = 1 + (Math.random() - 0.5) * 0.04;
	const freq = config.frequency * pitchVariation;

	// Oscillator
	const osc = ctx.createOscillator();
	osc.type = config.waveform;
	osc.frequency.setValueAtTime(freq, now);

	// Envelope (gain)
	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0, now);
	gain.gain.linearRampToValueAtTime(0.3, now + config.attack);
	gain.gain.linearRampToValueAtTime(config.sustain * 0.3, now + config.attack + config.decay);
	gain.gain.linearRampToValueAtTime(0, now + config.attack + config.decay + config.release);

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.start(now);
	osc.stop(now + config.attack + config.decay + config.release + 0.01);
}

/**
 * Get the shared AudioContext for use with AnalyserNode.
 */
export function getSharedAudioContext(): AudioContext {
	return getAudioContext();
}
