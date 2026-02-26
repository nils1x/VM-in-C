const STACK_SIZE = 10;

const REGISTERS = [
	{ name:'A',   cls:'gp',      desc:'General purpose' },
	{ name:'B',   cls:'gp',      desc:'General purpose' },
	{ name:'C',   cls:'gp',      desc:'General purpose' },
	{ name:'D',   cls:'gp',      desc:'General purpose' },
	{ name:'E',   cls:'gp',      desc:'General purpose' },
	{ name:'F',   cls:'gp',      desc:'General purpose' },
	{ name:'I',   cls:'gp',      desc:'General purpose (index)' },
	{ name:'J',   cls:'gp',      desc:'General purpose (index)' },
	{ name:'EX',  cls:'special', desc:'Excess / overflow result' },
	{ name:'EXA', cls:'special', desc:'Additional excess' },
	{ name:'IP',  cls:'ptr',     desc:'Instruction pointer' },
	{ name:'SP',  cls:'ptr',     desc:'Stack pointer' },
];

const INSTR_INFO = [
	{
		id:0, name:'HLT', sig:'hlt', desc:'Halt execution',
		effect:'Stops the main loop. No stack changes.',
		diagram: null
	},
	{
		id:1, name:'PSH', sig:'psh val', desc:'Push value onto stack',
		effect:'Increments SP, then writes <val> to stack[SP]. IP advances by 1 extra to skip the operand byte.',
		diagram: { before: [{ label:'...', cls:'' }], after: [{ label:'val', cls:'res' }, { label:'...', cls:'' }] }
	},
	{
		id:2, name:'POP', sig:'pop', desc:'Pop top of stack',
		effect:'Decrements SP. The value is gone — nothing is returned.',
		diagram: { before: [{ label:'top', cls:'top' }, { label:'...', cls:'' }], after: [{ label:'...', cls:'' }] }
	},
	{
		id:3, name:'ADD', sig:'add', desc:'Add top two stack values',
		effect:'Pops top into A, reads new top into B. Computes C = B + A. Writes C back to stack[SP]. Net: consumes 2 values, leaves 1 result.',
		diagram: { before: [{ label:'A (top)', cls:'top' }, { label:'B', cls:'sec' }, { label:'...', cls:'' }], after: [{ label:'B+A', cls:'res' }, { label:'...', cls:'' }] }
	},
	{
		id:4, name:'MUL', sig:'mul', desc:'Multiply top two stack values',
		effect:'Same pattern as ADD. Pops A, reads B, computes C = B * A, writes C to stack[SP].',
		diagram: { before: [{ label:'A (top)', cls:'top' }, { label:'B', cls:'sec' }, { label:'...', cls:'' }], after: [{ label:'B*A', cls:'res' }, { label:'...', cls:'' }] }
	},
	{
		id:5, name:'DIV', sig:'div', desc:'Divide top two stack values',
		effect:'Pops A, reads B, computes C = B / A (integer division), writes C to stack[SP]. Watch for divide-by-zero.',
		diagram: { before: [{ label:'A (top)', cls:'top' }, { label:'B', cls:'sec' }, { label:'...', cls:'' }], after: [{ label:'B/A', cls:'res' }, { label:'...', cls:'' }] }
	},
	{
		id:6, name:'SUB', sig:'sub', desc:'Subtract top two stack values',
		effect:'Pops A, reads B, computes C = B - A, writes C to stack[SP].',
		diagram: { before: [{ label:'A (top)', cls:'top' }, { label:'B', cls:'sec' }, { label:'...', cls:'' }], after: [{ label:'B-A', cls:'res' }, { label:'...', cls:'' }] }
	},
	{
		id:7, name:'SLT', sig:'slt', desc:'Set less than',
		effect:'Decrements SP, then computes stack[SP+1] < stack[SP] and stores the result (0 or 1) at stack[SP]. Net: consumes 2, leaves 0 or 1.',
		diagram: { before: [{ label:'top', cls:'top' }, { label:'second', cls:'sec' }, { label:'...', cls:'' }], after: [{ label:'0 or 1', cls:'res' }, { label:'...', cls:'' }] }
	},
	{
		id:8, name:'MOV', sig:'mov reg_a reg_b', desc:'Copy register value',
		effect:'reads reg_b = reg_a. No stack interaction. IP advances by 2 extra to skip both operand bytes.',
		diagram: null
	},
	{
		id:9, name:'SET', sig:'set reg val', desc:'Set register to value',
		effect:'registers[reg] = val. No stack interaction. IP advances by 2 extra.',
		diagram: null
	},
	{
		id:10, name:'LOG', sig:'log reg', desc:'Print register value',
		effect:'Prints registers[reg] to stdout. No stack changes. IP advances 1 extra.',
		diagram: null
	},
	{
		id:11, name:'IF', sig:'if reg val ip', desc:'Branch if equal',
		effect:'If registers[reg] == val, sets IP = target (jump). Otherwise IP skips the 3 operand bytes. Stack is untouched.',
		diagram: null
	},
	{
		id:12, name:'IFN', sig:'ifn reg val ip', desc:'Branch if not equal',
		effect:'If registers[reg] != val, sets IP = target (jump). Otherwise IP skips 3 operand bytes. Stack is untouched.',
		diagram: null
	},
	{
		id:13, name:'GLD', sig:'gld reg', desc:'Load register onto stack',
		effect:'Increments SP, then pushes registers[reg] onto stack[SP]. Useful for feeding register values into arithmetic.',
		diagram: { before: [{ label:'...', cls:'' }], after: [{ label:'reg', cls:'res' }, { label:'...', cls:'' }] }
	},
	{
		id:14, name:'GPT', sig:'gpt reg', desc:'Pop stack into register',
		effect:'Sets registers[reg] = stack[SP]. Does NOT decrement SP — the value stays on the stack.',
		diagram: { before: [{ label:'top', cls:'top' }, { label:'...', cls:'' }], after: [{ label:'top', cls:'top' }, { label:'...', cls:'' }] }
	},
	{
		id:15, name:'NOP', sig:'nop', desc:'No operation',
		effect:'Does nothing. SP and stack are unchanged.',
		diagram: null
	},
];

let regVals = {};
REGISTERS.forEach(r => regVals[r.name] = 0);
let stack    = new Array(STACK_SIZE).fill(null);
let sp       = -1;
let ip       = 0;
let highlights = {};
let changedRegs = new Set();
let expandedInstr = null;

function execPSH() {
	const val = parseInt(document.getElementById('pushVal').value) || 0;
	if (sp >= STACK_SIZE - 1) { addLog('PSH', `stack full`, true); return; }
	sp++;
	stack[sp] = val;
	highlights = { [sp]: 'pushed' };
	updateReg('SP', sp);
	addLog('PSH', `pushed ${val} → stack[${sp}]`);
	render();
}

function execPOP() {
	if (sp < 0) { addLog('POP', 'stack empty', true); return; }
	const val = stack[sp];
	highlights = { [sp]: 'popped' };
	render();
	setTimeout(() => {
		stack[sp] = null;
		sp--;
		highlights = {};
		updateReg('SP', sp);
		addLog('POP', `popped ${val} from stack[${sp+1}]`);
		render();
	}, 350);
}

function execADD() {
	if (sp < 1) { addLog('ADD', 'need at least 2 values', true); return; }
	const a = stack[sp];
	const b = stack[sp - 1];
	const c = b + a;
	highlights = { [sp]: 'op-a', [sp-1]: 'op-b' };
	render();
	setTimeout(() => {
		stack[sp] = null;
		sp--;
		stack[sp] = c;
		highlights = { [sp]: 'result' };
		updateReg('A', a); updateReg('B', b); updateReg('C', c);
		addLog('ADD', `${b} + ${a} = ${c} → stack[${sp}]`);
		render();
	}, 400);
}

function execSUB() {
	if (sp < 1) { addLog('SUB', 'need at least 2 values', true); return; }
	const a = stack[sp];
	const b = stack[sp - 1];
	const c = b - a;
	highlights = { [sp]: 'op-a', [sp-1]: 'op-b' };
	render();
	setTimeout(() => {
		stack[sp] = null; sp--;
		stack[sp] = c;
		highlights = { [sp]: 'result' };
		updateReg('A', a); updateReg('B', b); updateReg('C', c);
		addLog('SUB', `${b} - ${a} = ${c} → stack[${sp}]`);
		render();
	}, 400);
}

function execMUL() {
	if (sp < 1) { addLog('MUL', 'need at least 2 values', true); return; }
	const a = stack[sp];
	const b = stack[sp - 1];
	const c = b * a;
	highlights = { [sp]: 'op-a', [sp-1]: 'op-b' };
	render();
	setTimeout(() => {
		stack[sp] = null; sp--;
		stack[sp] = c;
		highlights = { [sp]: 'result' };
		updateReg('A', a); updateReg('B', b); updateReg('C', c);
		addLog('MUL', `${b} * ${a} = ${c} → stack[${sp}]`);
		render();
	}, 400);
}

function execDIV() {
	if (sp < 1) { addLog('DIV', 'need at least 2 values', true); return; }
	const a = stack[sp];
	if (a === 0) { addLog('DIV', 'divide by zero!', true); return; }
	const b = stack[sp - 1];
	const c = Math.trunc(b / a);
	highlights = { [sp]: 'op-a', [sp-1]: 'op-b' };
	render();
	setTimeout(() => {
		stack[sp] = null; sp--;
		stack[sp] = c;
		highlights = { [sp]: 'result' };
		updateReg('A', a); updateReg('B', b); updateReg('C', c);
		addLog('DIV', `${b} / ${a} = ${c} → stack[${sp}]`);
		render();
	}, 400);
}

function execSLT() {
	if (sp < 1) { addLog('SLT', 'need at least 2 values', true); return; }
	const top    = stack[sp];
	const second = stack[sp - 1];
	highlights = { [sp]: 'op-a', [sp-1]: 'op-b' };
	render();
	setTimeout(() => {
		sp--;
		const result = (second < top) ? 1 : 0;
		stack[sp] = result;
		highlights = { [sp]: 'result' };
		addLog('SLT', `${second} < ${top} → ${result}`);
		render();
	}, 400);
}

function nextIP() {
	ip = (ip + 1) % INSTR_INFO.length;
	updateReg('IP', ip);
	render();
}

function reset() {
	REGISTERS.forEach(r => regVals[r.name] = 0);
	stack    = new Array(STACK_SIZE).fill(null);
	sp       = -1; ip = 0;
	highlights   = {};
	changedRegs  = new Set();
	expandedInstr = null;
	render();
}

function updateReg(name, val) {
	regVals[name] = val;
	changedRegs.add(name);
	setTimeout(() => { changedRegs.delete(name); renderRegs(); }, 700);
}
