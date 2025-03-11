import { createHash } from "crypto";
import { ExposedPort, JobDefinition, Operation, OperationArgsMap, OperationType } from "../types";

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
    return createHash('sha256').update(inputString).digest('hex').substring(0, idLength);
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
};
