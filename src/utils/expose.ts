import bs58 from "bs58";
import nacl from "tweetnacl";
import { ExposedPort, JobDefinition, Operation, OperationArgsMap, OperationType } from "../types";

const createHash = (inputString: string, idLength: number = 44): string => {
    const base58Encoded = bs58.encode(nacl.hash(new TextEncoder().encode(inputString)));
    return  base58Encoded.slice(0, idLength);
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
    opIndex: number,
    port: number,
): string => {
    const idLength = 44;
    const inputString = `${opIndex}:${port}:${flowId}`;
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

    Object.entries(job.ops).forEach(([, op], index) => {
        if (isOpExposed(op as Operation<'container/run'>)) {
            const exposePorts = getExposePorts(op as Operation<'container/run'>);

            exposePorts.forEach((port) => {
                const exposeId = getExposeIdHash(
                    flowId,
                    index,
                    port.port,
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
