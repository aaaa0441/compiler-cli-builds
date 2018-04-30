import * as ts from 'typescript';
import { IvyCompilation } from './compilation';
export declare function ivyTransformFactory(compilation: IvyCompilation): ts.TransformerFactory<ts.SourceFile>;
