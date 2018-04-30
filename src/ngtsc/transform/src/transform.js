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
const translator_1 = require("./translator");
function ivyTransformFactory(compilation) {
    return (context) => {
        return (file) => {
            return transformIvySourceFile(compilation, context, file);
        };
    };
}
exports.ivyTransformFactory = ivyTransformFactory;
/**
 * A transformer which operates on ts.SourceFiles and applies changes from an `IvyCompilation`.
 */
function transformIvySourceFile(compilation, context, file) {
    const importManager = new translator_1.ImportManager();
    // Recursively scan through the AST and perform any updates requested by the IvyCompilation.
    const sf = visitNode(file);
    // Generate the import statements to prepend.
    const imports = importManager.getAllImports().map(i => ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamespaceImport(ts.createIdentifier(i.as))), ts.createLiteral(i.name)));
    // Prepend imports if needed.
    if (imports.length > 0) {
        sf.statements = ts.createNodeArray([...imports, ...sf.statements]);
    }
    return sf;
    // Helper function to process a class declaration.
    function visitClassDeclaration(node) {
        // Determine if this class has an Ivy field that needs to be added, and compile the field
        // to an expression if so.
        const res = compilation.compileIvyFieldFor(node);
        if (res !== undefined) {
            // There is a field to add. Translate the initializer for the field into TS nodes.
            const exprNode = translator_1.translateExpression(res.initializer, importManager);
            // Create a static property declaration for the new field.
            const property = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], res.field, undefined, undefined, exprNode);
            // Replace the class declaration with an updated version.
            node = ts.updateClassDeclaration(node, 
            // Remove the decorator which triggered this compilation, leaving the others alone.
            maybeFilterDecorator(node.decorators, compilation.ivyDecoratorFor(node)), node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], [...node.members, property]);
        }
        // Recurse into the class declaration in case there are nested class declarations.
        return ts.visitEachChild(node, child => visitNode(child), context);
    }
    function visitNode(node) {
        if (ts.isClassDeclaration(node)) {
            return visitClassDeclaration(node);
        }
        else {
            return ts.visitEachChild(node, child => visitNode(child), context);
        }
    }
}
function maybeFilterDecorator(decorators, toRemove) {
    if (decorators === undefined) {
        return undefined;
    }
    const filtered = decorators.filter(dec => ts.getOriginalNode(dec) !== toRemove);
    if (filtered.length === 0) {
        return undefined;
    }
    return ts.createNodeArray(filtered);
}
//# sourceMappingURL=transform.js.map