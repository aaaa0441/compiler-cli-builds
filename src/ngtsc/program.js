"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const transform_1 = require("./transform");
class NgtscProgram {
    constructor(rootNames, options, host, oldProgram) {
        this.options = options;
        this.host = host;
        this.tsProgram =
            ts.createProgram(rootNames, options, host, oldProgram && oldProgram.getTsProgram());
    }
    getTsProgram() { return this.tsProgram; }
    getTsOptionDiagnostics(cancellationToken) {
        return this.tsProgram.getOptionsDiagnostics(cancellationToken);
    }
    getNgOptionDiagnostics(cancellationToken) {
        return [];
    }
    getTsSyntacticDiagnostics(sourceFile, cancellationToken) {
        return this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
    }
    getNgStructuralDiagnostics(cancellationToken) {
        return [];
    }
    getTsSemanticDiagnostics(sourceFile, cancellationToken) {
        return this.tsProgram.getSemanticDiagnostics(sourceFile, cancellationToken);
    }
    getNgSemanticDiagnostics(fileName, cancellationToken) {
        return [];
    }
    loadNgStructureAsync() { return Promise.resolve(); }
    listLazyRoutes(entryRoute) {
        throw new Error('Method not implemented.');
    }
    getLibrarySummaries() {
        throw new Error('Method not implemented.');
    }
    getEmittedGeneratedFiles() {
        throw new Error('Method not implemented.');
    }
    getEmittedSourceFiles() {
        throw new Error('Method not implemented.');
    }
    emit(opts) {
        const emitCallback = opts && opts.emitCallback || defaultEmitCallback;
        const mergeEmitResultsCallback = opts && opts.mergeEmitResultsCallback || mergeEmitResults;
        const checker = this.tsProgram.getTypeChecker();
        // Set up the IvyCompilation, which manages state for the Ivy transformer.
        const adapters = [new transform_1.InjectableCompilerAdapter(checker)];
        const compilation = new transform_1.IvyCompilation(adapters, checker);
        // Analyze every source file in the program.
        this.tsProgram.getSourceFiles()
            .filter(file => !file.fileName.endsWith('.d.ts'))
            .forEach(file => compilation.analyze(file));
        // Since there is no .d.ts transformation API, .d.ts files are transformed during write.
        const writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
            if (fileName.endsWith('.d.ts')) {
                data = sourceFiles.reduce((data, sf) => compilation.transformedDtsFor(sf.fileName, data), data);
            }
            this.host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
        };
        // Run the emit, including a custom transformer that will downlevel the Ivy decorators in code.
        const emitResult = emitCallback({
            program: this.tsProgram,
            host: this.host,
            options: this.options,
            emitOnlyDtsFiles: false, writeFile,
            customTransformers: {
                before: [transform_1.ivyTransformFactory(compilation)],
            },
        });
        return emitResult;
    }
}
exports.NgtscProgram = NgtscProgram;
const defaultEmitCallback = ({ program, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers }) => program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
function mergeEmitResults(emitResults) {
    const diagnostics = [];
    let emitSkipped = false;
    const emittedFiles = [];
    for (const er of emitResults) {
        diagnostics.push(...er.diagnostics);
        emitSkipped = emitSkipped || er.emitSkipped;
        emittedFiles.push(...(er.emittedFiles || []));
    }
    return { diagnostics, emitSkipped, emittedFiles };
}
//# sourceMappingURL=program.js.map