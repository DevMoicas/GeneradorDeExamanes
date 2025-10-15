(function(){
    const ADMIN_USER = 'Moisesgri400';
    const ADMIN_PASS = 'proyectodetesismoises';

    const loginSection = document.getElementById('adminLoginSection');
    const dashboard = document.getElementById('adminDashboard');
    const msg = document.getElementById('adminMsg');
    const userInput = document.getElementById('adminUser');
    const passInput = document.getElementById('adminPass');
    const loginBtn = document.getElementById('adminLoginBtn');
    const logoutBtn = document.getElementById('logoutAdmin');

    const tableAlumnos = document.getElementById('tableAlumnos');
    const tableProfes = document.getElementById('tableProfes');
    const countAlumnos = document.getElementById('countAlumnos');
    const countProfes = document.getElementById('countProfes');

    const tableExams = document.getElementById('tableExams');
    const refreshExamsBtn = document.getElementById('refreshExams');

    const examViewModal = document.getElementById('examViewModal');
    const closeExamView = document.getElementById('closeExamView');
    const examViewContent = document.getElementById('examViewContent');

    function showMsg(text, isError=false){
        msg.className = 'p-3 rounded text-sm ' + (isError ? 'bg-red-500 text-white' : 'bg-green-600 text-white');
        msg.textContent = text;
        msg.classList.remove('hidden');
        setTimeout(()=>msg.classList.add('hidden'), 4000);
    }

    function isAuthed(){
        return sessionStorage.getItem('adminAuthed') === '1';
    }

    function requireAuth(){
        if(isAuthed()){
            loginSection.classList.add('hidden');
            dashboard.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            loadUsers();
            loadExams();
        } else {
            loginSection.classList.remove('hidden');
            dashboard.classList.add('hidden');
            logoutBtn.classList.add('hidden');
        }
    }

    loginBtn.addEventListener('click', () => {
        const u = (userInput.value || '').trim();
        const p = passInput.value || '';
        if(u === ADMIN_USER && p === ADMIN_PASS){
            sessionStorage.setItem('adminAuthed','1');
            showMsg('Acceso concedido');
            requireAuth();
        } else {
            showMsg('Credenciales inválidas', true);
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminAuthed');
        requireAuth();
    });

    async function loadUsers(){
        try {
            let users = [];
            try {
                const resp = await fetch(getApiUrl('/users'));
                if (resp.ok) {
                    const data = await resp.json();
                    users = data.users || [];
                }
            } catch(_) {}

            if (!users.length) {
                const dbm = window.getDatabaseManager && window.getDatabaseManager();
                if (dbm && dbm.db) {
                    const alumnosRes = dbm.db.exec("SELECT id, nombre, apellido, email, fecha_registro FROM usuarios WHERE tipo_usuario='alumno'")[0] || { values: [] };
                    const profesRes  = dbm.db.exec("SELECT id, nombre, apellido, email, fecha_registro FROM usuarios WHERE tipo_usuario='profesor'")[0] || { values: [] };
                    const mapRow = (r, tipo) => ({ id: r[0], nombre: r[1], apellido: r[2], email: r[3], createdAt: r[4], tipo_usuario: tipo });
                    users = [
                        ...alumnosRes.values.map(r => mapRow(r, 'alumno')),
                        ...profesRes.values.map(r => mapRow(r, 'profesor'))
                    ];
                }
            }

            const alumnos = users.filter(u => u.tipo_usuario === 'alumno');
            const profes = users.filter(u => u.tipo_usuario === 'profesor');

            function renderRows(rows){
                return rows.map(u => {
                    return `<tr>
                        <td class="py-2 pr-3">${u.nombre} ${u.apellido}</td>
                        <td class="py-2 pr-3">${u.email}</td>
                        <td class="py-2 pr-3">${u.createdAt || '-'} </td>
                        <td class="py-2">
                            <button data-del-user="${u.id}" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">Eliminar</button>
                        </td>
                    </tr>`;
                }).join('');
            }

            tableAlumnos.innerHTML = renderRows(alumnos);
            tableProfes.innerHTML = renderRows(profes);
            countAlumnos.textContent = String(alumnos.length);
            countProfes.textContent = String(profes.length);

        } catch(err){
            console.error('loadUsers error', err);
        }
    }

    function getApiUrl(path){
        try { if (window.getApiUrl) return window.getApiUrl(path); } catch(_) {}
        return path;
    }

    async function loadExams(){
        try {
            // Listar del backend local (exámenes activos)
            const resp = await fetch(getApiUrl('/exams/active/public'));
            const arr = resp.ok ? await resp.json() : [];
            tableExams.innerHTML = arr.map(ex => `
                <tr>
                    <td class="py-2 pr-3">${ex.examCode}</td>
                    <td class="py-2 pr-3">${ex.title}</td>
                    <td class="py-2 pr-3">${ex.subject}</td>
                    <td class="py-2 pr-3">${ex.numQuestions}</td>
                    <td class="py-2">
                        <button data-view="${ex.examCode}" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs mr-2">Ver</button>
                        <button data-del="${ex.examCode}" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">Eliminar</button>
                    </td>
                </tr>
            `).join('');
        } catch(err){
            console.error('loadExams error', err);
            tableExams.innerHTML = '<tr><td class="py-2 text-white/70">Error al cargar</td></tr>';
        }
    }

    refreshExamsBtn.addEventListener('click', loadExams);

    document.addEventListener('click', async (e) => {
        const t = e.target;
        if(t && t.hasAttribute('data-view')){
            const code = t.getAttribute('data-view');
            try {
                const resp = await fetch(getApiUrl(`/exam/code/${code}/json`));
                if(!resp.ok) throw new Error('not found');
                const exam = await resp.json();
                renderExamView(exam);
            } catch(err){
                console.error('view exam error', err);
            }
        }
        if(t && t.hasAttribute('data-del')){
            const code = t.getAttribute('data-del');
            if(confirm(`¿Eliminar examen ${code}?`)){
                try {
                    // Intento 1: ruta local
                    let resp = await fetch(getApiUrl(`/exam/code/${code}`), { method: 'DELETE' });
                    if(!resp.ok){
                        // Intento 2: ruta Vercel API
                        resp = await fetch(getApiUrl(`/api/exam/code/${code}`), { method: 'DELETE' });
                    }
                    if(!resp.ok) throw new Error('delete failed');
                    loadExams();
                } catch(err){
                    console.error('delete exam error', err);
                }
            }
        }
        if(t && t.hasAttribute('data-del-user')){
            const id = t.getAttribute('data-del-user');
            if (!confirm('¿Eliminar usuario?')) return;
            try {
                let resp = await fetch(getApiUrl(`/users/${id}`), { method: 'DELETE' });
                if (!resp.ok) {
                    const dbm = window.getDatabaseManager && window.getDatabaseManager();
                    if(dbm && dbm.db){
                        dbm.db.exec(`DELETE FROM usuarios WHERE id = ${Number(id)}`);
                    }
                }
                loadUsers();
            } catch(err){ console.error('delete user error', err); }
        }
    });

    function renderExamView(exam){
        const qs = (exam.questions || []).map(q => `
            <div class=\"bg-white/10 rounded p-3 mb-2\">
                <div class=\"font-semibold\">${q.id}. ${q.question}</div>
                <ul class=\"mt-1 text-sm\">
                    ${(q.options || []).map(o => `<li class=\"${o.isCorrect ? 'text-green-300' : ''}\">${o.letter}) ${o.text} ${o.isCorrect ? '(correcta)' : ''}</li>`).join('')}
                </ul>
            </div>
        `).join('');
        examViewContent.innerHTML = `
            <div class=\"mb-3\"><span class=\"font-semibold\">Código:</span> ${exam.examCode || '-'}</div>
            <div class=\"mb-3\"><span class=\"font-semibold\">Título:</span> ${exam.title}</div>
            <div class=\"mb-3\"><span class=\"font-semibold\">Materia:</span> ${exam.subject}</div>
            <div class=\"mb-3\"><span class=\"font-semibold\">Preguntas:</span> ${exam.numQuestions}</div>
            ${qs}
        `;
        examViewModal.classList.remove('hidden');
    }

    closeExamView.addEventListener('click', ()=> examViewModal.classList.add('hidden'));

    // Bootstrap
    requireAuth();
})();


