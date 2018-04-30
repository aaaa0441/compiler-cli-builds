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
const metadata_1 = require("../../metadata");
const declaration_1 = require("./declaration");
/**
 * Manages a compilation of Ivy decorators into static fields across an entire ts.Program.
 *
 * The compilation is stateful - source files are analyzed and records of the operations that need
 * to be performed during the transform/emit process are maintained internally.
 */
class IvyCompilation {
    constructor(adapters, checker) {
        this.adapters = adapters;
        this.checker = checker;
        /**
         * Tracks classes which have been analyzed and found to have an Ivy decorator, and the
         * information recorded about them for later compilation.
         */
        this.analysis = new Map();
        /**
         * Tracks the `DtsFileTransformer`s for each TS file that needs .d.ts transformations.
         */
        this.dtsMap = new Map();
    }
    /**
     * Analyze a source file and produce diagnostics for it (if any).
     */
    analyze(sf) {
        const diagnostics = [];
        const visit = (node) => {
            // Process nodes recursively, and look for class declarations with decorators.
            if (ts.isClassDeclaration(node) && node.decorators !== undefined) {
                // The first step is to reflect the decorators, which will identify decorators
                // that are imported from another module.
                const decorators = node.decorators.map(decorator => metadata_1.reflectDecorator(decorator, this.checker))
                    .filter(decorator => decorator !== null);
                // Look through the CompilerAdapters to see if any are relevant.
                this.adapters.forEach(adapter => {
                    // An adapter is relevant if it matches one of the decorators on the class.
                    const decorator = adapter.detect(decorators);
                    if (decorator === undefined) {
                        return;
                    }
                    // Check for multiple decorators on the same node. Technically speaking this
                    // could be supported, but right now it's an error.
                    if (this.analysis.has(node)) {
                        throw new Error('TODO.Diagnostic: Class has multiple Angular decorators.');
                    }
                    // Run analysis on the decorator. This will produce either diagnostics, an
                    // analysis result, or both.
                    const analysis = adapter.analyze(node, decorator);
                    if (analysis.diagnostics !== undefined) {
                        diagnostics.push(...analysis.diagnostics);
                    }
                    if (analysis.analysis !== undefined) {
                        this.analysis.set(node, {
                            adapter,
                            analysis: analysis.analysis,
                            decorator: decorator.node,
                        });
                    }
                });
            }
            ts.forEachChild(node, visit);
        };
        visit(sf);
        return diagnostics;
    }
    /**
     * Perform a compilation operation on the given class declaration and return instructions to an
     * AST transformer if any are available.
     */
    compileIvyFieldFor(node) {
        // Look to see whether the original node was analyzed. If not, there's nothing to do.
        const original = ts.getOriginalNode(node);
        if (!this.analysis.has(original)) {
            return undefined;
        }
        const op = this.analysis.get(original);
        // Run the actual compilation, which generates an Expression for the Ivy field.
        const res = op.adapter.compile(node, op.analysis);
        // Look up the .d.ts transformer for the input file and record that a field was generated,
        // which will allow the .d.ts to be transformed later.
        const fileName = node.getSourceFile().fileName;
        const dtsTransformer = this.getDtsTransformer(fileName);
        dtsTransformer.recordStaticField(node.name.text, res);
        // Return the instruction to the transformer so the field will be added.
        return res;
    }
    /**
     * Lookup the `ts.Decorator` which triggered transformation of a particular class declaration.
     */
    ivyDecoratorFor(node) {
        const original = ts.getOriginalNode(node);
        if (!this.analysis.has(original)) {
            return undefined;
        }
        return this.analysis.get(original).decorator;
    }
    /**
     * Process a .d.ts source string and return a transformed version that incorporates the changes
     * made to the source file.
     */
    transformedDtsFor(tsFileName, dtsOriginalSource) {
        // No need to transform if no changes have been requested to the input file.
        if (!this.dtsMap.has(tsFileName)) {
            return dtsOriginalSource;
        }
        // Return the transformed .d.ts source.
        return this.dtsMap.get(tsFileName).transform(dtsOriginalSource);
    }
    getDtsTransformer(tsFileName) {
        if (!this.dtsMap.has(tsFileName)) {
            this.dtsMap.set(tsFileName, new declaration_1.DtsFileTransformer());
        }
        return this.dtsMap.get(tsFileName);
    }
}
exports.IvyCompilation = IvyCompilation;
//# sourceMappingURL=compilation.js.map