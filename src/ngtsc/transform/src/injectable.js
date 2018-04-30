"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("@angular/compiler");
const ts = require("typescript");
const reflector_1 = require("../../metadata/src/reflector");
/**
 * Adapts the `compileIvyInjectable` compiler for `@Injectable` decorators to the Ivy compiler.
 */
class InjectableCompilerAdapter {
    constructor(checker) {
        this.checker = checker;
    }
    detect(decorator) {
        return decorator.find(dec => dec.name === 'Injectable' && dec.from === '@angular/core');
    }
    analyze(node, decorator) {
        return {
            analysis: extractInjectableMetadata(node, decorator, this.checker),
        };
    }
    compile(node, analysis) {
        const res = compiler_1.compileIvyInjectable(analysis);
        return {
            field: 'ngInjectableDef',
            initializer: res.expression,
            type: res.type,
        };
    }
}
exports.InjectableCompilerAdapter = InjectableCompilerAdapter;
/**
 * Read metadata from the `@Injectable` decorator and produce the `IvyInjectableMetadata`, the input
 * metadata needed to run `compileIvyInjectable`.
 */
function extractInjectableMetadata(clazz, decorator, checker) {
    if (clazz.name === undefined) {
        throw new Error(`@Injectables must have names`);
    }
    const name = clazz.name.text;
    const type = new compiler_1.WrappedNodeExpr(clazz.name);
    if (decorator.args.length === 0) {
        return {
            name,
            type,
            providedIn: new compiler_1.LiteralExpr(null),
            useType: getUseType(clazz, checker),
        };
    }
    else if (decorator.args.length === 1) {
        const metaNode = decorator.args[0];
        // Firstly make sure the decorator argument is an inline literal - if not, it's illegal to
        // transport references from one location to another. This is the problem that lowering
        // used to solve - if this restriction proves too undesirable we can re-implement lowering.
        if (!ts.isObjectLiteralExpression(metaNode)) {
            throw new Error(`In Ivy, decorator metadata must be inline.`);
        }
        // Resolve the fields of the literal into a map of field name to expression.
        const meta = reflector_1.reflectObjectLiteral(metaNode);
        let providedIn = new compiler_1.LiteralExpr(null);
        if (meta.has('providedIn')) {
            providedIn = new compiler_1.WrappedNodeExpr(meta.get('providedIn'));
        }
        if (meta.has('useValue')) {
            return { name, type, providedIn, useValue: new compiler_1.WrappedNodeExpr(meta.get('useValue')) };
        }
        else if (meta.has('useExisting')) {
            return { name, type, providedIn, useExisting: new compiler_1.WrappedNodeExpr(meta.get('useExisting')) };
        }
        else if (meta.has('useClass')) {
            return { name, type, providedIn, useClass: new compiler_1.WrappedNodeExpr(meta.get('useClass')) };
        }
        else if (meta.has('useFactory')) {
            // useFactory is special - the 'deps' property must be analyzed.
            const factory = new compiler_1.WrappedNodeExpr(meta.get('useFactory'));
            const deps = [];
            if (meta.has('deps')) {
                const depsExpr = meta.get('deps');
                if (!ts.isArrayLiteralExpression(depsExpr)) {
                    throw new Error(`In Ivy, deps metadata must be inline.`);
                }
                if (depsExpr.elements.length > 0) {
                    throw new Error(`deps not yet supported`);
                }
                deps.push(...depsExpr.elements.map(dep => getDep(dep, checker)));
            }
            return { name, type, providedIn, useFactory: { factory, deps } };
        }
        else {
            const useType = getUseType(clazz, checker);
            return { name, type, providedIn, useType };
        }
    }
    else {
        throw new Error(`Too many arguments to @Injectable`);
    }
}
function getUseType(clazz, checker) {
    const useType = [];
    const ctorParams = (reflector_1.reflectConstructorParameters(clazz, checker) || []);
    ctorParams.forEach(param => {
        let tokenExpr = param.typeValueExpr;
        let optional = false, self = false, skipSelf = false;
        param.decorators.filter(dec => dec.from === '@angular/core').forEach(dec => {
            if (dec.name === 'Inject') {
                if (dec.args.length !== 1) {
                    throw new Error(`Unexpected number of arguments to @Inject().`);
                }
                tokenExpr = dec.args[0];
            }
            else if (dec.name === 'Optional') {
                optional = true;
            }
            else if (dec.name === 'SkipSelf') {
                skipSelf = true;
            }
            else if (dec.name === 'Self') {
                self = true;
            }
            else {
                throw new Error(`Unexpected decorator ${dec.name} on parameter.`);
            }
            if (tokenExpr === null) {
                throw new Error(`No suitable token for parameter!`);
            }
        });
        const token = new compiler_1.WrappedNodeExpr(tokenExpr);
        useType.push({ token, optional, self, skipSelf });
    });
    return useType;
}
function getDep(dep, checker) {
    const depObj = {
        token: new compiler_1.WrappedNodeExpr(dep),
        optional: false,
        self: false,
        skipSelf: false,
    };
    function maybeUpdateDecorator(dec, token) {
        const source = reflector_1.reflectImportedIdentifier(dec, checker);
        if (source === null || source.from !== '@angular/core') {
            return;
        }
        switch (source.name) {
            case 'Inject':
                if (token !== undefined) {
                    depObj.token = new compiler_1.WrappedNodeExpr(token);
                }
                break;
            case 'Optional':
                depObj.optional = true;
                break;
            case 'SkipSelf':
                depObj.skipSelf = true;
                break;
            case 'Self':
                depObj.self = true;
                break;
        }
    }
    if (ts.isArrayLiteralExpression(dep)) {
        dep.elements.forEach(el => {
            if (ts.isIdentifier(el)) {
                maybeUpdateDecorator(el);
            }
            else if (ts.isNewExpression(el) && ts.isIdentifier(el.expression)) {
                const token = el.arguments && el.arguments.length > 0 && el.arguments[0] || undefined;
                maybeUpdateDecorator(el.expression, token);
            }
        });
    }
    return depObj;
}
//# sourceMappingURL=injectable.js.map