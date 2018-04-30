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
class ImportManager {
    constructor() {
        this.moduleToIndex = new Map();
        this.nextIndex = 0;
    }
    generateNamedImport(moduleName) {
        if (!this.moduleToIndex.has(moduleName)) {
            this.moduleToIndex.set(moduleName, `i${this.nextIndex++}`);
        }
        return this.moduleToIndex.get(moduleName);
    }
    getAllImports() {
        return Array.from(this.moduleToIndex.keys()).map(name => {
            const as = this.moduleToIndex.get(name);
            return { name, as };
        });
    }
}
exports.ImportManager = ImportManager;
function translateExpression(expression, imports) {
    return expression.visitExpression(new ExpressionTranslatorVisitor(imports), null);
}
exports.translateExpression = translateExpression;
function translateType(type, imports) {
    return type.visitType(new TypeTranslatorVisitor(imports), null);
}
exports.translateType = translateType;
class ExpressionTranslatorVisitor {
    constructor(imports) {
        this.imports = imports;
    }
    visitDeclareVarStmt(stmt, context) {
        throw new Error('Method not implemented.');
    }
    visitDeclareFunctionStmt(stmt, context) {
        throw new Error('Method not implemented.');
    }
    visitExpressionStmt(stmt, context) {
        throw new Error('Method not implemented.');
    }
    visitReturnStmt(stmt, context) {
        return ts.createReturn(stmt.value.visitExpression(this, context));
    }
    visitDeclareClassStmt(stmt, context) {
        throw new Error('Method not implemented.');
    }
    visitIfStmt(stmt, context) { throw new Error('Method not implemented.'); }
    visitTryCatchStmt(stmt, context) {
        throw new Error('Method not implemented.');
    }
    visitThrowStmt(stmt, context) { throw new Error('Method not implemented.'); }
    visitCommentStmt(stmt, context) {
        throw new Error('Method not implemented.');
    }
    visitJSDocCommentStmt(stmt, context) {
        throw new Error('Method not implemented.');
    }
    visitReadVarExpr(ast, context) {
        return ts.createIdentifier(ast.name);
    }
    visitWriteVarExpr(expr, context) {
        return ts.createBinary(ts.createIdentifier(expr.name), ts.SyntaxKind.EqualsToken, expr.value.visitExpression(this, context));
    }
    visitWriteKeyExpr(expr, context) {
        throw new Error('Method not implemented.');
    }
    visitWritePropExpr(expr, context) {
        throw new Error('Method not implemented.');
    }
    visitInvokeMethodExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitInvokeFunctionExpr(ast, context) {
        return ts.createCall(ast.fn.visitExpression(this, context), undefined, ast.args.map(arg => arg.visitExpression(this, context)));
    }
    visitInstantiateExpr(ast, context) {
        return ts.createNew(ast.classExpr.visitExpression(this, context), undefined, ast.args.map(arg => arg.visitExpression(this, context)));
    }
    visitLiteralExpr(ast, context) {
        if (ast.value === undefined) {
            return ts.createIdentifier('undefined');
        }
        else if (ast.value === null) {
            return ts.createNull();
        }
        else {
            return ts.createLiteral(ast.value);
        }
    }
    visitExternalExpr(ast, context) {
        if (ast.value.moduleName === null || ast.value.name === null) {
            throw new Error(`Import unknown module or symbol ${ast.value}`);
        }
        return ts.createPropertyAccess(ts.createIdentifier(this.imports.generateNamedImport(ast.value.moduleName)), ts.createIdentifier(ast.value.name));
    }
    visitConditionalExpr(ast, context) {
        return ts.createParen(ts.createConditional(ast.condition.visitExpression(this, context), ast.trueCase.visitExpression(this, context), ast.falseCase.visitExpression(this, context)));
    }
    visitNotExpr(ast, context) {
        return ts.createPrefix(ts.SyntaxKind.ExclamationToken, ast.condition.visitExpression(this, context));
    }
    visitAssertNotNullExpr(ast, context) {
        return ts.createNonNullExpression(ast.condition.visitExpression(this, context));
    }
    visitCastExpr(ast, context) {
        return ast.value.visitExpression(this, context);
    }
    visitFunctionExpr(ast, context) {
        return ts.createFunctionExpression(undefined, undefined, ast.name || undefined, undefined, ast.params.map(param => ts.createParameter(undefined, undefined, undefined, param.name, undefined, undefined, undefined)), undefined, ts.createBlock(ast.statements.map(stmt => stmt.visitStatement(this, context))));
    }
    visitBinaryOperatorExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitReadPropExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitReadKeyExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitLiteralArrayExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitLiteralMapExpr(ast, context) {
        const entries = ast.entries.map(entry => ts.createPropertyAssignment(entry.quoted ? ts.createLiteral(entry.key) : ts.createIdentifier(entry.key), entry.value.visitExpression(this, context)));
        return ts.createObjectLiteral(entries);
    }
    visitCommaExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitWrappedNodeExpr(ast, context) { return ast.node; }
}
class TypeTranslatorVisitor {
    constructor(imports) {
        this.imports = imports;
    }
    visitBuiltinType(type, context) {
        switch (type.name) {
            case compiler_1.BuiltinTypeName.Bool:
                return 'boolean';
            case compiler_1.BuiltinTypeName.Dynamic:
                return 'any';
            case compiler_1.BuiltinTypeName.Int:
            case compiler_1.BuiltinTypeName.Number:
                return 'number';
            case compiler_1.BuiltinTypeName.String:
                return 'string';
            default:
                throw new Error(`Unsupported builtin type: ${compiler_1.BuiltinTypeName[type.name]}`);
        }
    }
    visitExpressionType(type, context) {
        return type.value.visitExpression(this, context);
    }
    visitArrayType(type, context) {
        return `Array<${type.visitType(this, context)}>`;
    }
    visitMapType(type, context) {
        if (type.valueType !== null) {
            return `{[key: string]: ${type.valueType.visitType(this, context)}}`;
        }
        else {
            return '{[key: string]: any}';
        }
    }
    visitReadVarExpr(ast, context) {
        if (ast.name === null) {
            throw new Error(`ReadVarExpr with no variable name in type`);
        }
        return ast.name;
    }
    visitWriteVarExpr(expr, context) {
        throw new Error('Method not implemented.');
    }
    visitWriteKeyExpr(expr, context) {
        throw new Error('Method not implemented.');
    }
    visitWritePropExpr(expr, context) {
        throw new Error('Method not implemented.');
    }
    visitInvokeMethodExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitInvokeFunctionExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitInstantiateExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitLiteralExpr(ast, context) {
        if (typeof ast.value === 'string') {
            const escaped = ast.value.replace(/\'/g, '\\\'');
            return `'${escaped}'`;
        }
        else {
            return `${ast.value}`;
        }
    }
    visitExternalExpr(ast, context) {
        if (ast.value.moduleName === null || ast.value.name === null) {
            throw new Error(`Import unknown module or symbol`);
        }
        const base = `${this.imports.generateNamedImport(ast.value.moduleName)}.${ast.value.name}`;
        if (ast.typeParams !== null) {
            const generics = ast.typeParams.map(type => type.visitType(this, context)).join(', ');
            return `${base}<${generics}>`;
        }
        else {
            return base;
        }
    }
    visitConditionalExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitNotExpr(ast, context) { throw new Error('Method not implemented.'); }
    visitAssertNotNullExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitCastExpr(ast, context) { throw new Error('Method not implemented.'); }
    visitFunctionExpr(ast, context) { throw new Error('Method not implemented.'); }
    visitBinaryOperatorExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitReadPropExpr(ast, context) { throw new Error('Method not implemented.'); }
    visitReadKeyExpr(ast, context) { throw new Error('Method not implemented.'); }
    visitLiteralArrayExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitLiteralMapExpr(ast, context) {
        throw new Error('Method not implemented.');
    }
    visitCommaExpr(ast, context) { throw new Error('Method not implemented.'); }
    visitWrappedNodeExpr(ast, context) {
        const node = ast.node;
        if (ts.isIdentifier(node)) {
            return node.text;
        }
        else {
            throw new Error(`Unsupported WrappedNodeExpr in TypeTranslatorVisitor: ${ts.SyntaxKind[node.kind]}`);
        }
    }
}
exports.TypeTranslatorVisitor = TypeTranslatorVisitor;
//# sourceMappingURL=translator.js.map