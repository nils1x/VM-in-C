function addLog(op, detail, isErr = false) {
	const lb = document.getElementById('logBody');
	if (lb.children.length === 1 && lb.children[0].style.color === 'rgb(45, 49, 72)') lb.innerHTML = '';
	const el = document.createElement('div');
	el.className = 'log-entry';
	el.innerHTML = `<span class="op" style="${isErr ? 'color:#ef4444' : ''}">${op}</span><span class="detail">${detail}</span>`;
	lb.appendChild(el);
	lb.scrollTop = lb.scrollHeight;
}

function clearLog() {
	document.getElementById('logBody').innerHTML = '<span style="color:#2d3148">— cleared —</span>';
}

function toggleInstr(id) {
	expandedInstr = expandedInstr === id ? null : id;
	renderInstrs();
}

function renderRegs() {
	const rg = document.getElementById('regGrid');
	rg.innerHTML = REGISTERS.map(r => {
		const val = regVals[r.name];
		const hex = '0x' + val.toString(16).padStart(4,'0').toUpperCase();
		const hl  = (r.name === 'SP' || r.name === 'IP') ? 'highlighted' : '';
		const ch  = changedRegs.has(r.name) ? 'changed' : '';
		return `<div class="reg-row ${r.cls}">
		<span class="reg-name">${r.name}</span>
		<span class="reg-desc">${r.desc}</span>
		<span class="reg-val ${hl} ${ch}">${hex}</span>
	</div>`;
	}).join('');
}

function renderStack() {
	const sw = document.getElementById('stackWrap');
	let rows = '';
	for (let i = STACK_SIZE - 1; i >= 0; i--) {
		const hl      = highlights[i];
		const isTop   = (i === sp) && sp >= 0 && !hl;
		const isEmpty = stack[i] === null;
		let cls = '';
		if (hl)      cls = hl;
		else if (isTop)   cls = 'sp-top';
		else if (isEmpty) cls = 'empty';
		const valStr = isEmpty ? '——' : '0x' + stack[i].toString(16).padStart(4,'0').toUpperCase();
		const label  = hl === 'op-a' ? '← A (top)' : hl === 'op-b' ? '← B' : hl === 'result' ? '← result' : hl === 'pushed' ? '← pushed' : hl === 'popped' ? '← popping' : isTop ? '← SP' : i === 0 ? 'base' : '';
		rows += `<div class="stack-cell ${cls}">
		<span class="stack-addr">[${String(i).padStart(2,'0')}]</span>
		<span class="stack-val">${valStr}</span>
		<span class="stack-label">${label}</span>
	</div>`;
	}
	sw.innerHTML = rows;
}

function buildDiagram(diag) {
	if (!diag) return '';
	const renderFrames = (frames) => frames.map(f =>
		`<div class="sframe ${f.cls}">${f.label}</div>`
	).join('');
	return `<div class="stack-diagram">
	<div class="sdiag"><div class="sdiag-label">BEFORE</div>${renderFrames(diag.before)}</div>
	<div class="sarrow">→</div>
	<div class="sdiag"><div class="sdiag-label">AFTER</div>${renderFrames(diag.after)}</div>
</div>`;
}

function renderInstrs() {
	const il = document.getElementById('instrList');
	il.innerHTML = INSTR_INFO.map(ins => {
		const cur      = ins.id === ip ? 'ip-current' : '';
		const expanded = ins.id === expandedInstr ? 'expanded' : '';
		const arrow    = ins.id === ip ? '▶' : String(ins.id).padStart(2,' ');
		const diagramHTML = ins.id === expandedInstr ? buildDiagram(ins.diagram) : '';
		return `<div class="instr-row ${cur} ${expanded}" onclick="toggleInstr(${ins.id})">
		<span class="instr-id">${arrow}</span>
		<span class="instr-name">${ins.name}</span>
		<span class="instr-sig">${ins.sig}<br><span style="color:#374151">${ins.desc}</span></span>
		<div class="instr-effect">
			${ins.effect}
			${diagramHTML}
		</div>
	</div>`;
	}).join('');
}

function render() {
	renderRegs();
	renderStack();
	renderInstrs();
}

render();
