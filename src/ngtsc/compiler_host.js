"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Implementation of `CompilerHost` which delegates to a native TypeScript host in most cases.
 */
class NgtscCompilerHost {
    constructor(delegate) {
        this.delegate = delegate;
    }
    getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
        return this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    }
    getDefaultLibFileName(options) {
        return this.delegate.getDefaultLibFileName(options);
    }
    writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles) {
        return this.delegate.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
    }
    getCurrentDirectory() { return this.delegate.getCurrentDirectory(); }
    getDirectories(path) { return this.delegate.getDirectories(path); }
    getCanonicalFileName(fileName) {
        return this.delegate.getCanonicalFileName(fileName);
    }
    useCaseSensitiveFileNames() { return this.delegate.useCaseSensitiveFileNames(); }
    getNewLine() { return this.delegate.getNewLine(); }
    fileExists(fileName) { return this.delegate.fileExists(fileName); }
    readFile(fileName) { return this.delegate.readFile(fileName); }
    loadResource(file) { throw new Error('Method not implemented.'); }
    preloadResource(file) { throw new Error('Method not implemented.'); }
}
exports.NgtscCompilerHost = NgtscCompilerHost;
//# sourceMappingURL=compiler_host.js.map