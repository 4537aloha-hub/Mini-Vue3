import { compile } from './compiler/compile.js';
import {
    createApp,
    render,
    h,
    Text,
    Fragment,
    nextTick,
} from './runtime/index.js';

import { reactive } from './reactivity/reactive.js';
import { ref } from './reactivity/ref.js';
import { computed } from './reactivity/computed.js';
import { effect } from './reactivity/effect.js';
import { renderList } from './runtime/helps/renderlist.js';
import { resolveComponent } from './runtime/createApp.js';
import { parse } from './compiler/parse.js';

export const MiniVue = (window.MiniVue  = {
    createApp,
    render,
    h,
    Text,
    Fragment,
    nextTick,
    reactive,
    ref,
    computed,
    effect,
    compile,
    renderList,
    resolveComponent,
    parse,
})

export default MiniVue;

