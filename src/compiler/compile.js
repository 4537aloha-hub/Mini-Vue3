import { parse } from './parse.js';
import { generate } from './codegen.js';

export function compile(template) {
    const ast = parse(template);
    return generate(ast);
}