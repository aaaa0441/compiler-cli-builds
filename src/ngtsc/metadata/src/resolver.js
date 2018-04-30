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
 * resolver.ts implements partial computation of expressions, resolving expressions to static
 * values where possible and returning a `DynamicValue` signal when not.
 */
const ts = require("typescript");
/**
 * Represents a value which cannot be determined statically.
 *
 * Use `isDynamicValue` to determine whether a `ResolvedValue` is a `DynamicValue`.
 */
class DynamicValue {
    constructor() {
        /**
         * This is needed so the "is DynamicValue" assertion of `isDynamicValue` actually has meaning.
         *
         * Otherwise, "is DynamicValue" is akin to "is {}" which doesn't trigger narrowing.
         */
        this._isDynamic = true;
    }
}
exports.DynamicValue = DynamicValue;
/**
 * An internal flyweight for `DynamicValue`. Eventually the dynamic value will carry information
 * on the location of the node that could not be statically computed.
 */
const DYNAMIC_VALUE = new DynamicValue();
/**
 * Used to test whether a `ResolvedValue` is a `DynamicValue`.
 */
function isDynamicValue(value) {
    return value === DYNAMIC_VALUE;
}
exports.isDynamicValue = isDynamicValue;
/**
 * A reference to a `ts.Node`.
 *
 * For example, if an expression evaluates to a function or class definition, it will be returned
 * as a `Reference` (assuming references are allowed in evaluation).
 */
class Reference {
    constructor(node) {
        this.node = node;
    }
}
exports.Reference = Reference;
/**
 * Statically resolve the given `ts.Expression` into a `ResolvedValue`.
 *
 * @param node the expression to statically resolve if possible
 * @param checker a `ts.TypeChecker` used to understand the expression
 * @returns a `ResolvedValue` representing the resolved value
 */
function staticallyResolve(node, checker) {
    return new StaticInterpreter(checker, new Map(), 0 /* No */)
        .visit(node);
}
exports.staticallyResolve = staticallyResolve;
function literalBinaryOp(op) {
    return { op, literal: true };
}
function referenceBinaryOp(op) {
    return { op, literal: false };
}
const BINARY_OPERATORS = new Map([
    [ts.SyntaxKind.PlusToken, literalBinaryOp((a, b) => a + b)],
    [ts.SyntaxKind.MinusToken, literalBinaryOp((a, b) => a - b)],
    [ts.SyntaxKind.AsteriskToken, literalBinaryOp((a, b) => a * b)],
    [ts.SyntaxKind.SlashToken, literalBinaryOp((a, b) => a / b)],
    [ts.SyntaxKind.PercentToken, literalBinaryOp((a, b) => a % b)],
    [ts.SyntaxKind.AmpersandToken, literalBinaryOp((a, b) => a & b)],
    [ts.SyntaxKind.BarToken, literalBinaryOp((a, b) => a | b)],
    [ts.SyntaxKind.CaretToken, literalBinaryOp((a, b) => a ^ b)],
    [ts.SyntaxKind.LessThanToken, literalBinaryOp((a, b) => a < b)],
    [ts.SyntaxKind.LessThanEqualsToken, literalBinaryOp((a, b) => a <= b)],
    [ts.SyntaxKind.GreaterThanToken, literalBinaryOp((a, b) => a > b)],
    [ts.SyntaxKind.GreaterThanEqualsToken, literalBinaryOp((a, b) => a >= b)],
    [ts.SyntaxKind.LessThanLessThanToken, literalBinaryOp((a, b) => a << b)],
    [ts.SyntaxKind.GreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >> b)],
    [ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >>> b)],
    [ts.SyntaxKind.AsteriskAsteriskToken, literalBinaryOp((a, b) => Math.pow(a, b))],
    [ts.SyntaxKind.AmpersandAmpersandToken, referenceBinaryOp((a, b) => a && b)],
    [ts.SyntaxKind.BarBarToken, referenceBinaryOp((a, b) => a || b)]
]);
const UNARY_OPERATORS = new Map([
    [ts.SyntaxKind.TildeToken, a => ~a], [ts.SyntaxKind.MinusToken, a => -a],
    [ts.SyntaxKind.PlusToken, a => +a], [ts.SyntaxKind.ExclamationToken, a => !a]
]);
class StaticInterpreter {
    constructor(checker, scope, allowReferences) {
        this.checker = checker;
        this.scope = scope;
        this.allowReferences = allowReferences;
    }
    visit(node) { return this.visitExpression(node); }
    visitExpression(node) {
        if (node.kind === ts.SyntaxKind.TrueKeyword) {
            return true;
        }
        else if (node.kind === ts.SyntaxKind.FalseKeyword) {
            return false;
        }
        else if (ts.isStringLiteral(node)) {
            return node.text;
        }
        else if (ts.isNumericLiteral(node)) {
            return parseFloat(node.text);
        }
        else if (ts.isObjectLiteralExpression(node)) {
            return this.visitObjectLiteralExpression(node);
        }
        else if (ts.isIdentifier(node)) {
            return this.visitIdentifier(node);
        }
        else if (ts.isPropertyAccessExpression(node)) {
            return this.visitPropertyAccessExpression(node);
        }
        else if (ts.isCallExpression(node)) {
            return this.visitCallExpression(node);
        }
        else if (ts.isConditionalExpression(node)) {
            return this.visitConditionalExpression(node);
        }
        else if (ts.isPrefixUnaryExpression(node)) {
            return this.visitPrefixUnaryExpression(node);
        }
        else if (ts.isBinaryExpression(node)) {
            return this.visitBinaryExpression(node);
        }
        else if (ts.isArrayLiteralExpression(node)) {
            return this.visitArrayLiteralExpression(node);
        }
        else if (ts.isParenthesizedExpression(node)) {
            return this.visitParenthesizedExpression(node);
        }
        else if (ts.isElementAccessExpression(node)) {
            return this.visitElementAccessExpression(node);
        }
        else if (ts.isAsExpression(node)) {
            return this.visitExpression(node.expression);
        }
        else if (ts.isNonNullExpression(node)) {
            return this.visitExpression(node.expression);
        }
        else if (ts.isClassDeclaration(node)) {
            return this.visitDeclaration(node);
        }
        else {
            return DYNAMIC_VALUE;
        }
    }
    visitArrayLiteralExpression(node) {
        const array = [];
        for (let i = 0; i < node.elements.length; i++) {
            const element = node.elements[i];
            if (ts.isSpreadElement(element)) {
                const spread = this.visitExpression(element.expression);
                if (isDynamicValue(spread)) {
                    return DYNAMIC_VALUE;
                }
                if (!Array.isArray(spread)) {
                    throw new Error(`Unexpected value in spread expression: ${spread}`);
                }
                array.push(...spread);
            }
            else {
                const result = this.visitExpression(element);
                if (isDynamicValue(result)) {
                    return DYNAMIC_VALUE;
                }
                array.push(result);
            }
        }
        return array;
    }
    visitObjectLiteralExpression(node) {
        const map = new Map();
        for (let i = 0; i < node.properties.length; i++) {
            const property = node.properties[i];
            if (ts.isPropertyAssignment(property)) {
                const name = this.stringNameFromPropertyName(property.name);
                // Check whether the name can be determined statically.
                if (name === undefined) {
                    return DYNAMIC_VALUE;
                }
                map.set(name, this.visitExpression(property.initializer));
            }
            else if (ts.isShorthandPropertyAssignment(property)) {
                const symbol = this.checker.getShorthandAssignmentValueSymbol(property);
                if (symbol === undefined || symbol.valueDeclaration === undefined) {
                    return DYNAMIC_VALUE;
                }
                map.set(property.name.text, this.visitDeclaration(symbol.valueDeclaration));
            }
            else if (ts.isSpreadAssignment(property)) {
                const spread = this.visitExpression(property.expression);
                if (isDynamicValue(spread)) {
                    return DYNAMIC_VALUE;
                }
                if (!(spread instanceof Map)) {
                    throw new Error(`Unexpected value in spread assignment: ${spread}`);
                }
                spread.forEach((value, key) => map.set(key, value));
            }
            else {
                return DYNAMIC_VALUE;
            }
        }
        return map;
    }
    visitIdentifier(node) {
        let symbol = this.checker.getSymbolAtLocation(node);
        if (symbol === undefined) {
            return DYNAMIC_VALUE;
        }
        const result = this.visitSymbol(symbol);
        if (this.allowReferences === 1 /* Yes */ && isDynamicValue(result)) {
            return new Reference(node);
        }
        return result;
    }
    visitSymbol(symbol) {
        while (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = this.checker.getAliasedSymbol(symbol);
        }
        if (symbol.declarations === undefined) {
            return DYNAMIC_VALUE;
        }
        if (symbol.valueDeclaration !== undefined) {
            return this.visitDeclaration(symbol.valueDeclaration);
        }
        return symbol.declarations.reduce((prev, decl) => {
            if (!(isDynamicValue(prev) || prev instanceof Reference)) {
                return prev;
            }
            return this.visitDeclaration(decl);
        }, DYNAMIC_VALUE);
    }
    visitDeclaration(node) {
        if (ts.isVariableDeclaration(node)) {
            if (!node.initializer) {
                return undefined;
            }
            return this.visitExpression(node.initializer);
        }
        else if (ts.isParameter(node) && this.scope.has(node)) {
            return this.scope.get(node);
        }
        else if (ts.isExportAssignment(node)) {
            return this.visitExpression(node.expression);
        }
        else if (ts.isSourceFile(node)) {
            return this.visitSourceFile(node);
        }
        return this.allowReferences === 1 /* Yes */ ? new Reference(node) : DYNAMIC_VALUE;
    }
    visitElementAccessExpression(node) {
        const lhs = this.withReferences.visitExpression(node.expression);
        if (node.argumentExpression === undefined) {
            throw new Error(`Expected argument in ElementAccessExpression`);
        }
        if (isDynamicValue(lhs)) {
            return DYNAMIC_VALUE;
        }
        const rhs = this.withNoReferences.visitExpression(node.argumentExpression);
        if (isDynamicValue(rhs)) {
            return DYNAMIC_VALUE;
        }
        if (typeof rhs !== 'string' && typeof rhs !== 'number') {
            throw new Error(`ElementAccessExpression index should be string or number, got ${typeof rhs}: ${rhs}`);
        }
        return this.accessHelper(lhs, rhs);
    }
    visitPropertyAccessExpression(node) {
        const lhs = this.withReferences.visitExpression(node.expression);
        const rhs = node.name.text;
        // TODO: handle reference to class declaration.
        if (isDynamicValue(lhs)) {
            return DYNAMIC_VALUE;
        }
        return this.accessHelper(lhs, rhs);
    }
    visitSourceFile(node) {
        const map = new Map();
        const symbol = this.checker.getSymbolAtLocation(node);
        if (symbol === undefined) {
            return DYNAMIC_VALUE;
        }
        const exports = this.checker.getExportsOfModule(symbol);
        exports.forEach(symbol => map.set(symbol.name, this.visitSymbol(symbol)));
        return map;
    }
    accessHelper(lhs, rhs) {
        const strIndex = `${rhs}`;
        if (lhs instanceof Map) {
            if (lhs.has(strIndex)) {
                return lhs.get(strIndex);
            }
            else {
                throw new Error(`Invalid map access: [${Array.from(lhs.keys())}] dot ${rhs}`);
            }
        }
        else if (Array.isArray(lhs)) {
            if (rhs === 'length') {
                return rhs.length;
            }
            if (typeof rhs !== 'number' || !Number.isInteger(rhs)) {
                return DYNAMIC_VALUE;
            }
            if (rhs < 0 || rhs >= lhs.length) {
                throw new Error(`Index out of bounds: ${rhs} vs ${lhs.length}`);
            }
            return lhs[rhs];
        }
        else if (lhs instanceof Reference) {
            const ref = lhs.node;
            if (ts.isClassDeclaration(ref)) {
                let value = undefined;
                const member = ref.members.filter(member => isStatic(member))
                    .find(member => member.name !== undefined &&
                    this.stringNameFromPropertyName(member.name) === strIndex);
                if (member !== undefined) {
                    if (ts.isPropertyDeclaration(member) && member.initializer !== undefined) {
                        value = this.visitExpression(member.initializer);
                    }
                    else if (ts.isMethodDeclaration(member)) {
                        value = this.allowReferences === 1 /* Yes */ ? new Reference(member) :
                            DYNAMIC_VALUE;
                    }
                }
                return value;
            }
        }
        throw new Error(`Invalid dot property access: ${lhs} dot ${rhs}`);
    }
    visitCallExpression(node) {
        const lhs = this.withReferences.visitExpression(node.expression);
        if (!(lhs instanceof Reference)) {
            throw new Error(`attempting to call something that is not a function: ${lhs}`);
        }
        else if (!isFunctionOrMethodDeclaration(lhs.node) || !lhs.node.body) {
            throw new Error(`calling something that is not a function declaration? ${ts.SyntaxKind[lhs.node.kind]}`);
        }
        const fn = lhs.node;
        const body = fn.body;
        if (body.statements.length !== 1 || !ts.isReturnStatement(body.statements[0])) {
            throw new Error('Function body must have a single return statement only.');
        }
        const ret = body.statements[0];
        const newScope = new Map();
        fn.parameters.forEach((param, index) => {
            let value = undefined;
            if (index < node.arguments.length) {
                const arg = node.arguments[index];
                value = this.visitExpression(arg);
            }
            if (value === undefined && param.initializer !== undefined) {
                value = this.visitExpression(param.initializer);
            }
            newScope.set(param, value);
        });
        return ret.expression !== undefined ? this.withScope(newScope).visitExpression(ret.expression) :
            undefined;
    }
    visitConditionalExpression(node) {
        const condition = this.withNoReferences.visitExpression(node.condition);
        if (isDynamicValue(condition)) {
            return condition;
        }
        if (condition) {
            return this.visitExpression(node.whenTrue);
        }
        else {
            return this.visitExpression(node.whenFalse);
        }
    }
    visitPrefixUnaryExpression(node) {
        const operatorKind = node.operator;
        if (!UNARY_OPERATORS.has(operatorKind)) {
            throw new Error(`Unsupported prefix unary operator: ${ts.SyntaxKind[operatorKind]}`);
        }
        const op = UNARY_OPERATORS.get(operatorKind);
        const value = this.visitExpression(node.operand);
        return isDynamicValue(value) ? DYNAMIC_VALUE : op(value);
    }
    visitBinaryExpression(node) {
        const tokenKind = node.operatorToken.kind;
        if (!BINARY_OPERATORS.has(tokenKind)) {
            throw new Error(`Unsupported binary operator: ${ts.SyntaxKind[tokenKind]}`);
        }
        const opRecord = BINARY_OPERATORS.get(tokenKind);
        let lhs, rhs;
        if (opRecord.literal) {
            const withNoReferences = this.withNoReferences;
            lhs = literal(withNoReferences.visitExpression(node.left));
            rhs = literal(withNoReferences.visitExpression(node.right));
        }
        else {
            lhs = this.visitExpression(node.left);
            rhs = this.visitExpression(node.right);
        }
        return isDynamicValue(lhs) || isDynamicValue(rhs) ? DYNAMIC_VALUE : opRecord.op(lhs, rhs);
    }
    visitParenthesizedExpression(node) {
        return this.visitExpression(node.expression);
    }
    stringNameFromPropertyName(node) {
        if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
            return node.text;
        }
        else {
            const literal = this.withNoReferences.visitExpression(node.expression);
            return typeof literal === 'string' ? literal : undefined;
        }
    }
    get withReferences() {
        return this.allowReferences === 1 /* Yes */ ?
            this :
            new StaticInterpreter(this.checker, this.scope, 1 /* Yes */);
    }
    get withNoReferences() {
        return this.allowReferences === 0 /* No */ ?
            this :
            new StaticInterpreter(this.checker, this.scope, 0 /* No */);
    }
    withScope(scope) {
        return new StaticInterpreter(this.checker, scope, this.allowReferences);
    }
}
function isStatic(element) {
    return element.modifiers !== undefined &&
        element.modifiers.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword);
}
function isFunctionOrMethodDeclaration(node) {
    return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node);
}
function literal(value) {
    if (value === null || value === undefined || typeof value === 'string' ||
        typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (isDynamicValue(value)) {
        return DYNAMIC_VALUE;
    }
    throw new Error(`Value ${value} is not literal and cannot be used in this context.`);
}
//# sourceMappingURL=resolver.js.map