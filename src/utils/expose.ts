import { ExposedPort, JobDefinition, Operation, OperationArgsMap, OperationType } from "../types";

const createHash = (inputString: string, idLength: number = 45): string => {
    let hash1 = 0x811c9dc5; // FNV-1a 32-bit prime
    let hash2 = 0xC5F375A7; // Another large prime

    for (let i = 0; i < inputString.length; i++) {
        const char = inputString.charCodeAt(i);
        
        // Hash1: FNV-1a style hash
        hash1 ^= char;
        hash1 += (hash1 << 1) + (hash1 << 4) + (hash1 << 7) + (hash1 << 8) + (hash1 << 24);

        // Hash2: XOR-shift mixing
        hash2 ^= char;
        hash2 = (hash2 << 5) ^ (hash2 >> 3);
    }

    // Combine both hashes and convert to hex
    let hexHash = ((hash1 >>> 0).toString(16) + (hash2 >>> 0).toString(16)).toLowerCase();

    // Extend or truncate the hash to the desired length
    while (hexHash.length < idLength) {
        hexHash += hexHash;
    }

    return hexHash.substring(0, idLength);
}

const isPrivate = (job: JobDefinition): boolean => {
    return job.ops.some((op: Operation<OperationType>) => {
        if (op.type !== 'container/run') return false;

        const args = op.args as OperationArgsMap['container/run'];
        const expose = args.expose;

        const isExposed =
            (Array.isArray(expose) && expose.length > 0) ||
            typeof expose === 'number';

        return isExposed && args.private === true;
    });
};

const getExposePorts = (op: Operation<'container/run'>): ExposedPort[] => {
    const expose = (op.args as OperationArgsMap['container/run']).expose;

    if (!expose) return [];

    if (typeof expose === 'number') {
        return [{ port: expose, type: 'none' }];
    }

    if (Array.isArray(expose)) {
        return expose.map(e => (typeof e === 'number' ? { port: e, type: 'none' } : e));
    }

    return [];
};

const isOpExposed = (op: Operation<'container/run'>): boolean => {
    const exposePorts = getExposePorts(op);
    return exposePorts.length > 0;
};

const getExposeIdHash = (
    flowId: string,
    opId: string,
    port: string,
): string => {
    const idLength = 45;
    const inputString = `${flowId}:${opId}:${port}`;
    return createHash(inputString, idLength);
};

const getJobExposeIdHash = (
    job: JobDefinition,
    flowId: string,
): string[] => {
    const hashes: string[] = [];

    const privateMode = isPrivate(job);

    if (privateMode) {
        return ['private'];
    }

    Object.entries(job.ops).forEach(([, op]) => {
        if (isOpExposed(op as Operation<'container/run'>)) {
            const exposePorts = getExposePorts(op as Operation<'container/run'>);

            exposePorts.forEach((port) => {
                const exposeId = getExposeIdHash(
                    flowId,
                    op.id,
                    port.toString(),
                );
                hashes.push(`${exposeId}`);
            });
        }
    });

    return hashes;
}

export {
    getJobExposeIdHash,
    getExposeIdHash,
    getExposePorts,
    isOpExposed,
    createHash,
};
