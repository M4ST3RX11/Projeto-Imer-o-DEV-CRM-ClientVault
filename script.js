(() => { // Envolve todo o código em uma IIFE para proteger o escopo
    const app = { // Objeto principal da aplicação
        // 1. STATE MANAGEMENT: Gerenciamento centralizado do estado da aplicação
        state: {
            clients: [],
            filteredClients: [],
            currentClient: null,
            isEditMode: false,
            currentPage: 1,
            rowsPerPage: 9,
            currentFilter: {
                searchTerm: '',
                priority: 'Todos',
            },
            currentSort: 'nome-asc',
            currentTheme: localStorage.getItem('theme') || 'dark',
            calendarCurrentDate: new Date(), // For calendar modal
            calendarSelectedDate: null,
            calendarNotes: [],
        },

        // 2. SELECTORS: Objeto vazio para ser preenchido após o DOM carregar.
        selectors: {},

        // 3. API/DATA HANDLING: Funções para buscar e gerenciar dados
        api: {
            fetchClients: async () => {
                app.selectors.loadingSpinner.style.display = 'flex';
                try {
                    const response = await fetch("http://localhost:3000/api/data");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    app.state.clients = data.clients.map((client, index) => ({
                        ...client,
                        id: client.id || `client_${index}`,
                        observacoes: client.observacoes || "",
                        dataAgendada: client.dataAgendada || null,
                        prioridade: client.prioridade || "Baixa",
                    }));
                    app.state.calendarNotes = data.calendarNotes || [];
                    app.ui.showToast("Dados carregados com sucesso!", 'success');
                } catch (error) {
                    console.error("Falha ao carregar os dados dos clientes:", error);
                    app.ui.showToast("Erro ao carregar dados. Verifique o servidor.", 'error');
                    app.selectors.cardContainer.innerHTML = `<p style="color: var(--danger-color); text-align: center; font-size: 1.2rem;">Não foi possível conectar ao servidor. Verifique se o back-end (node server.js) está em execução e tente recarregar a página.</p>`;
                } finally {
                    app.selectors.loadingSpinner.style.display = 'none';
                }
            },
            saveClients: async () => {
                app.selectors.loadingSpinner.style.display = 'flex';
                try {
                    const response = await fetch('http://localhost:3000/api/data', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            clients: app.state.clients,
                            calendarNotes: app.state.calendarNotes,
                        }),
                    });
                    if (!response.ok) {
                        throw new Error(`Erro do servidor: ${response.statusText}`);
                    }
                    app.ui.showToast('Alterações salvas com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao salvar:', error);
                    app.ui.showToast(`Falha ao salvar os dados: ${error.message}`, 'error');
                } finally {
                    app.selectors.loadingSpinner.style.display = 'none';
                }
            },
            updateClient: (updatedClient) => {
                const index = app.state.clients.findIndex(c => c.numero === updatedClient.numero);
                if (index !== -1) {
                    app.state.clients = [
                        ...app.state.clients.slice(0, index),
                        { ...app.state.clients[index], ...updatedClient },
                        ...app.state.clients.slice(index + 1)
                    ];
                    app.api.saveClients();
                    return true;
                }
                return false;
            },
            addClient: (newClient) => {
                const clientWithNumero = { ...newClient, numero: app.utils.generateNextSequentialNumber() };
                app.state.clients.unshift(clientWithNumero);
                app.api.saveClients();
                return clientWithNumero;
            },
            deleteClient: async (clientNumero) => {
                app.state.clients = app.state.clients.filter(dado => dado.numero !== clientNumero); // Remove o cliente do estado
                await app.api.saveClients();
            },
            saveNote: async (note) => {
                const index = app.state.calendarNotes.findIndex(n => n.id === note.id);
                if (index !== -1) {
                    app.state.calendarNotes[index] = note;
                } else {
                    app.state.calendarNotes.push(note);
                }
                await app.api.saveClients();
            },
            deleteNote: async (noteId) => {
                app.state.calendarNotes = app.state.calendarNotes.filter(n => n.id !== noteId);
                await app.api.saveClients();
            },
        },
        // 4. UI RENDERING: Funções responsáveis por atualizar a UI
        ui: {
            renderAll: () => {
                app.ui.renderClients();
                app.ui.renderInicioTab();
            },

            renderClients: () => {
                const { clients, currentFilter, currentSort, currentPage, rowsPerPage } = app.state;
                const container = app.selectors.cardContainer;

                if (!container) return;

                const processedData = app.utils.processClientData(clients, currentFilter, currentSort);
                app.state.filteredClients = processedData;

                const startIndex = (currentPage - 1) * rowsPerPage;
                const endIndex = startIndex + rowsPerPage;
                const paginatedData = app.state.filteredClients.slice(startIndex, endIndex);

                if (paginatedData.length > 0) {
                    container.innerHTML = paginatedData.map(client => app.ui.createClientCard(client)).join('');
                } else if (clients.length === 0) {
                    container.innerHTML = '<div class="empty-state"><p>Nenhum cliente cadastrado ainda.</p><p>Vá para a aba "Adicionar Contato" para começar!</p></div>';
                } else {
                    container.innerHTML = '<div class="empty-state"><p>Nenhum cliente encontrado.</p><p>Tente ajustar sua busca ou filtros.</p></div>';
                }

                app.ui.renderPaginationControls();
                app.ui.renderClientCount();
            },

            createClientCard: (client) => {
                const priorityClass = `priority-${client.prioridade?.toLowerCase() || 'baixa'}`;
                const email = client['e-mail'];
                const empresa = client.Empresa || client.Empreza || 'Não informado';
                const dataAgendada = client.dataAgendada ? app.utils.parseDate(client.dataAgendada).toLocaleDateString('pt-BR') : null;
                const isOverdue = client.dataAgendada && app.utils.parseDate(client.dataAgendada) < new Date() && !app.utils.isToday(app.utils.parseDate(client.dataAgendada));
                const overdueIcon = isOverdue ? '<span class="overdue-indicator" title="Agendamento Atrasado">⚠️</span>' : '';
                const newClientClass = client.isNew ? 'new-client-highlight' : '';

                return `
            <article class="client-card ${newClientClass}" data-client-id="${client.numero}">
                <div class="card-priority-indicator ${priorityClass}"></div>
                <div class="card-header">
                    <h2>${client.nome}</h2>
                    <div class="priority-container" data-action="change-priority">
                        <select class="priority-select priority-${client.prioridade?.toLowerCase() || 'baixa'}" data-action="change-priority">
                            <option value="Alta" ${client.prioridade === 'Alta' ? 'selected' : ''}>Alta</option>
                            <option value="Média" ${client.prioridade === 'Média' ? 'selected' : ''}>Média</option>
                            <option value="Baixa" ${client.prioridade === 'Baixa' ? 'selected' : ''}>Baixa</option>
                        </select>
                    </div>
                </div>
                <div class="card-body">
                    <p><strong>Assunto:</strong> ${client.assunto}</p>
                    <p><strong>Empresa:</strong> ${empresa} (${client.Cargo || 'N/A'})</p>
                    <div class="card-schedule-info">
                        <button class="calendario-date-button ${dataAgendada ? 'date-set' : ''}" data-action="schedule">
                            📅 ${dataAgendada || 'Agendar'} ${overdueIcon}
                        </button>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="contact-actions">
                        <a href="mailto:${email}" class="card-action-btn email-link" data-action="email" title="${email}">📧 E-mail</a>
                        <a href="tel:${client.numero.replace(/\s/g, '')}" class="card-action-btn" data-action="phone" title="${client.numero}">📞 Ligar</a>
                            </div>
                        </div>
            </article>
        `;
            },

            renderPaginationControls: () => {
                let paginationContainer = document.getElementById('pagination-controls');
                if (!paginationContainer) {
                    paginationContainer.id = 'pagination-controls';
                    app.selectors.clientControls.insertAdjacentElement('afterend', paginationContainer);
                }
                paginationContainer.innerHTML = '';

                const { currentPage, filteredClients, rowsPerPage } = app.state;
                const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
                if (totalPages <= 1) return;


                const prevButton = document.createElement('button');
                prevButton.textContent = 'Anterior';
                prevButton.className = 'pagination-btn';
                prevButton.disabled = currentPage === 1;
                prevButton.addEventListener('click', () => {
                    if (currentPage > 1) {
                        app.state.currentPage--;
                        app.ui.renderClients();
                    }
                });
                paginationContainer.appendChild(prevButton);

                const pageInfo = document.createElement('span');
                pageInfo.className = 'pagination-info';
                pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
                paginationContainer.appendChild(pageInfo);

                const nextButton = document.createElement('button');
                nextButton.textContent = 'Próximo';
                nextButton.className = 'pagination-btn';
                nextButton.disabled = currentPage === totalPages;
                nextButton.addEventListener('click', () => {
                    if (currentPage < totalPages) {
                        app.state.currentPage++;
                        app.ui.renderClients();
                    }
                });
                paginationContainer.appendChild(nextButton);
            },

            renderClientCount: () => {
                let countContainer = document.getElementById('client-count-container');
                if (!countContainer) {
                    countContainer = document.createElement('div');
                    countContainer.id = 'client-count-container';
                    const controlsContainer = app.selectors.clientControls || document.getElementById('client-controls');
                    if (controlsContainer) {
                        controlsContainer.appendChild(countContainer);
                    }
                }

                const total = app.state.clients.length;
                const filtered = app.state.filteredClients.length;

                if (total === filtered) {
                    countContainer.innerHTML = `<p>Exibindo <strong>${total}</strong> cliente(s).</p>`;
                } else {
                    countContainer.innerHTML = `<p>Exibindo <strong>${filtered}</strong> de <strong>${total}</strong> cliente(s).</p>`;
                }
            },


            renderInicioTab: () => {
                const inicioContainer = app.selectors.inicioTabContent;
                if (!inicioContainer) return;
                const agendamentosContent = document.getElementById('agendamentos');
                if (agendamentosContent) {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);

                    const agendadosHoje = [];
                    const agendadosPassados = [];
                    const agendadosFuturo = [];

                    const clientsWithDate = app.state.clients.filter(c => c.dataAgendada);

                    clientsWithDate.forEach(client => {
                        const dataAgendamento = app.utils.parseDate(client.dataAgendada);
                        dataAgendamento.setHours(0, 0, 0, 0);

                        if (dataAgendamento.getTime() === hoje.getTime()) {
                            agendadosHoje.push(client);
                        } else if (dataAgendamento < hoje) {
                            agendadosPassados.push(client);
                        } else {
                            agendadosFuturo.push(client);
                        }
                    });

                    const createSectionHTML = (title, appointments, type, sortFn) => {
                        let html = `<h3>${title}</h3>`;
                        if (appointments.length > 0) {
                            if (sortFn) appointments.sort(sortFn);
                            html += '<ul class="appointment-list">';
                            appointments.forEach(client => html += app.ui.createAppointmentMiniCard(client, type));
                            html += '</ul>';
                        } else {
                            html += `<p>Nenhum agendamento ${title.split(' ')[1].toLowerCase()}.</p>`;
                        }
                        return html;
                    };

                    let html = createSectionHTML('Agendado para Hoje', agendadosHoje, 'today');
                    html += createSectionHTML('Agendamentos Passados', agendadosPassados, 'past-due', (a, b) => app.utils.parseDate(b.dataAgendada) - app.utils.parseDate(a.dataAgendada));
                    html += createSectionHTML('Próximos Agendamentos', agendadosFuturo, 'future', (a, b) => app.utils.parseDate(a.dataAgendada) - app.utils.parseDate(b.dataAgendada));

                    agendamentosContent.innerHTML = html;

                    agendamentosContent.querySelectorAll('.appointment-mini-card').forEach(item => {
                        item.addEventListener('click', () => {
                            const client = app.state.clients.find(c => c.numero === item.dataset.clientId);
                            if (client) {
                                app.events.openClientDetailModal(client);
                            }
                        });
                    });
                }
            },

            createAppointmentMiniCard: (client, type) => {
                const formattedDate = client.dataAgendada ? app.utils.parseDate(client.dataAgendada).toLocaleDateString('pt-BR') : 'N/A';
                const icons = { today: '☀️', 'past-due': '⚠️', future: '⏰' };

                return `
                    <li class="appointment-mini-card ${type}" data-client-id="${client.numero}">
                        <div class="card-icon">${icons[type]}</div>
                        <div class="card-details">
                            <span class="card-name">${client.nome}</span>
                            <span class="card-assunto">${client.assunto}</span>
                            <span class="card-date">${formattedDate}</span>
                        </div>
                    </li>
                `;
            },

            // Função refatorada para criar um calendário inline com animações
            createCustomCalendar: (container, initialDate, onDateSelect) => {
                let currentDate = new Date(initialDate); // A data que controla o mês/ano exibido
                let selectedDate = app.state.calendarSelectedDate ? new Date(app.state.calendarSelectedDate) : null; // A data clicada pelo usuário

                // Função interna para renderizar o calendário. Será chamada para navegação de mês.
                const renderCalendar = () => {
                    container.innerHTML = ''; // Limpa o container antes de renderizar

                    const month = currentDate.getMonth();
                    const year = currentDate.getFullYear();

                    // Cria o cabeçalho com nome do mês e botões de navegação
                    const header = document.createElement('div');
                    header.className = 'calendar-header';
                    header.innerHTML = `
                        <button class="calendar-nav-btn" data-nav="prev">&lt;</button>
                        <span id="calendar-month-year">${currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                        <button class="calendar-nav-btn" data-nav="next">&gt;</button>
                    `;
                    container.appendChild(header);

                    // Cria a grade dos dias
                    const grid = document.createElement('div');
                    grid.className = 'calendar-grid';

                    // Adiciona os nomes dos dias da semana
                    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(dayName => {
                        const weekdayEl = document.createElement('div');
                        weekdayEl.className = 'weekday';
                        weekdayEl.textContent = dayName;
                        grid.appendChild(weekdayEl);
                    });

                    // Preenche os dias do mês
                    const firstDayOfMonth = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();

                    // Células vazias para dias do mês anterior
                    for (let i = 0; i < firstDayOfMonth; i++) {
                        const emptyCell = document.createElement('div');
                        emptyCell.className = 'calendar-day other-month';
                        grid.appendChild(emptyCell);
                    }

                    // Células para cada dia do mês atual
                    for (let day = 1; day <= daysInMonth; day++) {
                        const dayEl = document.createElement('div');
                        dayEl.className = 'calendar-day';
                        dayEl.textContent = day;
                        dayEl.dataset.day = day;

                        const thisDate = new Date(year, month, day);
                        thisDate.setHours(0, 0, 0, 0);

                        // Marca o dia como selecionado se for o caso
                        if (selectedDate && thisDate.getTime() === selectedDate.getTime()) {
                            dayEl.classList.add('selected');
                        }

                        // Adiciona o evento de clique para selecionar um dia
                        dayEl.addEventListener('click', () => {
                            selectedDate = thisDate;
                            app.state.calendarSelectedDate = selectedDate; // Atualiza o estado global
                            
                            // Chama a função de callback imediatamente ao clicar
                            onDateSelect(selectedDate); 

                            // Remove a classe 'selected' de outros dias e a adiciona ao clicado
                            const allDays = grid.querySelectorAll('.calendar-day');
                            allDays.forEach(d => d.classList.remove('selected'));
                            dayEl.classList.add('selected');
                        });

                        grid.appendChild(dayEl);
                    }

                    container.appendChild(grid);

                    // Adiciona eventos aos botões de navegação do cabeçalho
                    header.querySelector('[data-nav="prev"]').addEventListener('click', () => {
                        currentDate.setMonth(currentDate.getMonth() - 1);
                        renderCalendar();
                    });
                    header.querySelector('[data-nav="next"]').addEventListener('click', () => {
                        currentDate.setMonth(currentDate.getMonth() + 1);
                        renderCalendar();
                    });
                }

                renderCalendar();
            },

            showToast: (message, type = 'success') => {
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                toast.textContent = message;
                app.selectors.toastContainer.appendChild(toast);

                setTimeout(() => {
                    toast.classList.add('show');
                }, 100);

                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        toast.remove();
                    }, 500);
                }, 3000);
            },

            toggleModal: (modalElement, show = false) => {
                if (show) {
                    modalElement.classList.add('active');
                    app.selectors.body.classList.add('modal-open');
                } else {
                    modalElement.classList.remove('active');
                    app.selectors.body.classList.remove('modal-open');
                }
            },
        },

        // 5. THEME HANDLING: Gerenciamento de temas (claro/escuro)
        theme: {
            applyTheme: (theme) => {
                app.selectors.body.dataset.theme = theme;
                app.state.currentTheme = theme;
                localStorage.setItem('theme', theme);
            },
            toggleTheme: () => {
                const newTheme = app.state.currentTheme === 'dark' ? 'light' : 'dark';
                app.theme.applyTheme(newTheme);
            },
        },

        // 6. UTILITY FUNCTIONS: Funções utilitárias
        utils: {
            parseDate: (dateString) => {
                if (!dateString) return null;
                if (dateString instanceof Date) return dateString;
                const date = new Date(dateString);
                // Corrige problema de fuso horário para datas sem tempo (YYYY-MM-DD)
                if (dateString.indexOf('T') === -1) {
                    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
                }
                return date;
             },
             isToday: (someDate) => {
                const today = new Date();
                return someDate.getDate() === today.getDate() &&
                       someDate.getMonth() === today.getMonth() &&
                       someDate.getFullYear() === today.getFullYear();
             },
             generateNextSequentialNumber: () => {
                const allNumbers = app.state.clients.map(client => {
                    const match = client.numero.match(/\d+$/);
                    return match ? parseInt(match[0], 10) : 0;
                });
        
                const maxNumero = allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
        
                // Retorna o próximo número sequencial no formato desejado
                return `79 0000 ${String(maxNumero + 1).padStart(4, '0')}`;
             },
             formatDateToISO: (date) => date.toISOString().split('T')[0],
             generateUniqueId: () => '_' + Math.random().toString(36).substr(2, 9),
 
            processClientData: (clients, filter, sort) => {
                const filtered = clients.filter(client => {
                    const searchTerm = filter.searchTerm.toLowerCase();
                    const empresa = client.Empresa || client.Empreza || '';
                    const matchesSearch =
                        (client.nome || '').toLowerCase().includes(searchTerm) ||
                        (client.assunto || '').toLowerCase().includes(searchTerm) ||
                        (empresa).toLowerCase().includes(searchTerm) ||
                        (client.Cargo || '').toLowerCase().includes(searchTerm);
                    const matchesPriority = filter.priority === 'Todos' || client.prioridade === filter.priority;
                    return matchesSearch && matchesPriority;
                });

                return filtered.sort((a, b) => {
                    if (sort === 'nome-asc') {
                        return (a.nome || '').localeCompare(b.nome || '');
                    }
                    if (sort === 'data-desc') {
                        const dateA = a.dataAgendada ? app.utils.parseDate(a.dataAgendada) : new Date('1970-01-01T00:00:00.000Z'); // Trata null como data antiga
                        const dateB = b.dataAgendada ? app.utils.parseDate(b.dataAgendada) : new Date('1970-01-01T00:00:00.000Z'); // Trata null como data antiga
                        return dateB.getTime() - dateA.getTime();
                    }
                    return 0;
                });
            },
        },


        // 7. EVENT HANDLERS & LISTENERS: Gerenciadores de eventos
        events: {
            // Função para limpar filtros (movida para 'events' para consistência)
            clearFilters: () => {
                app.selectors.searchInput.value = '';
                app.state.currentFilter.searchTerm = '';
                const todosButton = document.querySelector('.filter-btn[data-priority="Todos"]');
                if (todosButton) app.events.handlePriorityFilter(todosButton);
            },

            openClientDetailModal: (clientData) => {
                app.state.currentClient = clientData;
                app.state.isEditMode = false;
                app.selectors.modalClientName.textContent = clientData.nome;
                app.selectors.modalClientAssunto.textContent = clientData.assunto;
                app.selectors.modalClientNumero.textContent = clientData.numero;
                const email = clientData['e-mail'];
                app.selectors.modalClientEmail.innerHTML = `<a href="mailto:${email}" class="email-link">${email}</a>`;
                app.selectors.modalClientEmpresa.textContent = clientData.Empresa || clientData.Empreza;
                app.selectors.modalClientCargo.textContent = clientData.Cargo;
                app.selectors.modalClientPrioridade.textContent = clientData.prioridade;
                app.selectors.modalClientDataCadastro.textContent = clientData.dataCadastro ? new Date(clientData.dataCadastro + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informado';
                app.selectors.modalClientObservacoes.value = clientData.observacoes || '';
                app.selectors.modalClientObservacoes.readOnly = true;
                // Populate edit form (initially hidden)
                app.selectors.editNome.value = clientData.nome;
                app.selectors.editAssunto.value = clientData.assunto;
                app.selectors.editEmail.value = clientData['e-mail'];
                app.selectors.editEmpresa.value = clientData.Empresa || clientData.Empreza;
                app.selectors.editCargo.value = clientData.Cargo;
                app.selectors.editPrioridade.value = clientData.prioridade;

                // Altera o campo de data para editar a DATA DE AGENDAMENTO em vez da data de cadastro
                const agendamentoInput = app.selectors.editDataCadastro;
                const agendamentoLabel = agendamentoInput.previousElementSibling; // Pega a label associada
                if (agendamentoLabel) agendamentoLabel.textContent = 'Data de Agendamento:';
                agendamentoInput.value = clientData.dataAgendada ? app.utils.formatDateToISO(app.utils.parseDate(clientData.dataAgendada)) : '';


                app.selectors.modalDetails.style.display = 'block';
                app.selectors.modalEditForm.style.display = 'none';
                app.selectors.editClientButton.style.display = 'inline-flex';
                app.selectors.saveClientButton.style.display = 'none';
                app.selectors.deleteClientButton.style.display = 'none';

                app.ui.toggleModal(app.selectors.clientDetailModal, true);
            },

            // Calendar Tab Specific Functions
            renderWhiteboardCalendar: () => {
                const { whiteboardCalendarContainer, currentMonthYearDisplay } = app.selectors;
                const { currentCalendarDate, clients, calendarNotes } = app.state;
                whiteboardCalendarContainer.innerHTML = '';
                const month = currentCalendarDate.getMonth();
                const year = currentCalendarDate.getFullYear();
                currentMonthYearDisplay.textContent = `${currentCalendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
                ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(dayName => {
                    const dayHeader = document.createElement('div');
                    dayHeader.className = 'calendar-day-whiteboard day-header';
                    dayHeader.textContent = dayName;
                    whiteboardCalendarContainer.appendChild(dayHeader);
                });
                const firstDayOfMonth = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                for (let i = 0; i < firstDayOfMonth; i++) {
                    const emptyDay = document.createElement('div');
                    emptyDay.className = 'calendar-day-whiteboard other-month';
                    whiteboardCalendarContainer.appendChild(emptyDay);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const formattedDate = app.utils.formatDateToISO(date);

                    const dayElement = document.createElement('div');
                    dayElement.className = 'calendar-day-whiteboard current-month';
                    dayElement.dataset.date = formattedDate;
                    const dayNumber = document.createElement('div');
                    dayNumber.className = 'day-number';
                    dayNumber.textContent = day;
                    dayElement.appendChild(dayNumber);

                    clients.filter(c => c.dataAgendada && app.utils.formatDateToISO(app.utils.parseDate(c.dataAgendada)) === formattedDate)
                           .forEach((meeting, index) => {
                               const meetingEl = document.createElement('div');
                               meetingEl.className = 'calendar-meeting-item meeting-item-animated'; // Adiciona a classe de animação
                                meetingEl.textContent = meeting.nome;
                               // Adiciona um delay para a animação, criando um efeito escalonado
                               meetingEl.style.animationDelay = `${index * 100}ms`;
                               meetingEl.dataset.clientId = meeting.numero; // Armazena o ID do cliente
                               meetingEl.title = `Ver detalhes de ${meeting.nome}`; // Tooltip
                               meetingEl.addEventListener('click', (e) => {
                                   e.stopPropagation(); // Impede que o clique propague para o dia do calendário
                                   const client = app.state.clients.find(c => c.numero === meeting.numero);
                                   if (client) app.events.openClientDetailModal(client);
                               });
                               dayElement.appendChild(meetingEl);
                           });

                    calendarNotes.filter(n => n.date === formattedDate)
                                 .forEach(note => {
                                     const noteEl = document.createElement('div');
                                     noteEl.className = 'post-it-note';
                                     noteEl.textContent = note.text;
                                     noteEl.dataset.noteId = note.id;
                                     noteEl.addEventListener('click', (e) => {
                                         e.stopPropagation();
                                         app.events.openNoteModal(formattedDate, note);
                                     });
                                     dayElement.appendChild(noteEl);
                                 });

                    dayElement.addEventListener('click', () => app.events.openNoteModal(formattedDate));
                    whiteboardCalendarContainer.appendChild(dayElement);
                }
            },

            handlePrevMonth: () => {
                app.state.currentCalendarDate.setMonth(app.state.currentCalendarDate.getMonth() - 1);
                app.events.renderWhiteboardCalendar();
            },

            handleNextMonth: () => {
                app.state.currentCalendarDate.setMonth(app.state.currentCalendarDate.getMonth() + 1);
                app.events.renderWhiteboardCalendar();
            },

            openNoteModal: (date, note = null) => {
                app.selectors.noteDateDisplay.textContent = `Nota para ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}`;
                app.selectors.noteTextInput.value = note ? note.text : '';
                app.selectors.saveNoteButton.dataset.noteDate = date;
                app.selectors.saveNoteButton.dataset.noteId = note ? note.id : '';
                app.selectors.deleteNoteButton.style.display = note ? 'inline-flex' : 'none';
                app.selectors.deleteNoteButton.dataset.noteId = note ? note.id : '';
                app.ui.toggleModal(app.selectors.noteModal, true);
            },

            setupModalEventListeners: () => {
                app.selectors.closeModalButton.addEventListener('click', () => app.events.closeClientDetailModal());
                app.selectors.clientDetailModal.addEventListener('click', (e) => {
                    if (e.target === app.selectors.clientDetailModal) app.events.closeClientDetailModal();
                });
                app.selectors.editClientButton.addEventListener('click', () => app.events.toggleEditMode());
                app.selectors.saveClientButton.addEventListener('click', app.events.saveClientChanges);
                app.selectors.deleteClientButton.addEventListener('click', app.events.deleteClientFromModal);
            },

            saveNote: async () => {
                const date = app.selectors.saveNoteButton.dataset.noteDate;
                const noteId = app.selectors.saveNoteButton.dataset.noteId;
                const text = app.selectors.noteTextInput.value.trim();

                if (!text) {
                    app.ui.showToast('A nota não pode estar vazia!', 'error');
                    return;
                }

                const note = {
                    id: noteId || app.utils.generateUniqueId(),
                    date: date,
                    text: text,
                };

                await app.api.saveNote(note);
                app.ui.showToast('Nota salva com sucesso!', 'success');
                app.ui.toggleModal(app.selectors.noteModal, false);
                app.events.renderWhiteboardCalendar();
            },

            deleteNote: async () => {
                const noteId = app.selectors.deleteNoteButton.dataset.noteId;
                if (noteId && confirm('Tem certeza que deseja excluir esta nota?')) {
                    await app.api.deleteNote(noteId);
                    app.ui.showToast('Nota excluída com sucesso!', 'success');
                    app.ui.toggleModal(app.selectors.noteModal, false);
                    app.events.renderWhiteboardCalendar();
                }
            },

            setupEventListeners: () => {
                const cardContainer = app.selectors.cardContainer;
                if (cardContainer) {
                    cardContainer.addEventListener('click', app.events.handleCardClick);
                    cardContainer.addEventListener('change', app.events.handlePriorityChangeOnCard);
                }
            },

            handleCardClick: (e) => {
                const target = e.target;
                const card = target.closest('.client-card');
                if (!card) return;

                const client = app.state.clients.find(c => c.numero === card.dataset.clientId);
                if (!client) return;

                const action = target.dataset.action;
                // Verifica se o clique foi em um elemento interativo (link, botão, select)
                const isInteractiveElement = target.matches('a, button, select');

                // Se o clique foi em um elemento interativo, executa a ação específica
                if (isInteractiveElement) {
                    if (action === 'schedule') {
                        app.events.openCalendarModal(client);
                    }
                    // Para 'a' (email/ligar) e 'select' (prioridade), os eventos padrão ou outros listeners já cuidam da ação.
                } else { // Se o clique foi em qualquer outra parte do card, abre o modal
                    app.events.openClientDetailModal(client);
                }
            },

            handlePriorityChangeOnCard: async (e) => {
                const select = e.target;
                if (select.matches('.priority-select')) {
                    const clientId = select.closest('.client-card')?.dataset.clientId;
                    const client = app.state.clients.find(c => c.numero === clientId);
                    if (client) {
                        client.prioridade = select.value;
                        await app.api.updateClient(client);
                        app.ui.showToast(`Prioridade de ${client.nome} atualizada.`, 'success');
                        app.ui.renderClients();
                    }
                }
            },
            handleAboutModal: () => {
                const openModal = () => app.ui.toggleModal(app.selectors.aboutModal, true);
                const closeModal = () => app.ui.toggleModal(app.selectors.aboutModal, false);

                app.selectors.logoButton.addEventListener('click', openModal);
                app.selectors.closeAboutModalButtons.forEach(btn => btn.addEventListener('click', closeModal));
                app.selectors.aboutModal.addEventListener('click', (e) => {
                    if (e.target === app.selectors.aboutModal) closeModal();
                });
            },

            handleTabClick: (tabId) => {
                app.selectors.tabButtons.forEach(btn => btn.classList.remove('active'));
                app.selectors.tabContents.forEach(content => content.classList.remove('active'));

                document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
                document.getElementById(tabId).classList.add('active');

                if (tabId === 'calendario') {
                    app.state.currentCalendarDate = new Date(); // Garante que o calendário sempre abra no mês atual
                    app.events.renderWhiteboardCalendar();
                }
                if (tabId === 'clientes') {
                    app.state.currentPage = 1;
                    app.ui.renderClients();
                } else if (tabId === 'inicio') {
                    app.ui.renderInicioTab();
                }
            },

            handleSubTabClick: (subTabId) => {
                app.selectors.subTabButtons.forEach(btn => btn.classList.remove('active'));
                app.selectors.subTabContents.forEach(content => content.classList.remove('active'));

                document.querySelector(`.sub-tab-button[data-subtab="${subTabId}"]`).classList.add('active');
                document.getElementById(subTabId).classList.add('active');
            },

            handleSearchInput: () => {
                app.state.currentFilter.searchTerm = app.selectors.searchInput.value;
                app.state.currentPage = 1;
                app.ui.renderClients();
            },

            handleSearch: () => {
                app.state.currentFilter.searchTerm = app.selectors.searchInput.value;
                app.state.currentPage = 1;
                app.ui.renderClients();
            },

            handlePriorityFilter: (clickedButton) => {
                app.selectors.priorityFilterButtons.forEach(btn => btn.classList.remove('active'));
                clickedButton.classList.add('active');
                app.state.currentFilter.priority = clickedButton.dataset.priority;
                app.state.currentPage = 1;
                app.ui.renderClients();
            },

            handleSort: (e) => {
                app.state.currentSort = e.target.value;
                app.state.currentPage = 1;
                app.ui.renderClients();
            },

            handleAddContactSubmit: async (e) => {
                e.preventDefault();
                const formData = new FormData(app.selectors.addContactForm);
                const newClient = Object.fromEntries(formData.entries());
                newClient.isNew = true;
                const addedClient = app.api.addClient(newClient);
                app.ui.showToast('Cliente adicionado com sucesso!', 'success');
                app.selectors.addContactForm.reset();
                app.events.clearFilters();
                app.events.handleTabClick('clientes');
                setTimeout(() => {
                    if (addedClient) {
                        delete addedClient.isNew; // Remove a propriedade
                        app.ui.renderClients(); // Re-renderiza para remover a classe
                    }
                }, 3000); // O destaque dura 3 segundos
            },

            closeClientDetailModal: () => {
                app.ui.toggleModal(app.selectors.clientDetailModal, false);
                app.state.currentClient = null;
                app.state.isEditMode = false;
            },

            toggleEditMode: (forceState) => {
                app.state.isEditMode = typeof forceState === 'boolean' ? forceState : !app.state.isEditMode;
                const isEditing = app.state.isEditMode;
                if (isEditing) {
                    app.selectors.modalDetails.style.display = 'none';
                    app.selectors.modalEditForm.style.display = 'block';
                    app.selectors.editClientButton.style.display = 'none';
                    app.selectors.saveClientButton.style.display = 'inline-flex';
                    app.selectors.deleteClientButton.style.display = 'inline-flex';
                    app.selectors.modalClientObservacoes.readOnly = false;
                } else {
                    app.selectors.modalDetails.style.display = 'block';
                    app.selectors.modalEditForm.style.display = 'none';
                    app.selectors.editClientButton.style.display = 'inline-flex';
                    app.selectors.saveClientButton.style.display = 'none';
                    app.selectors.deleteClientButton.style.display = 'none';
                    app.selectors.modalClientObservacoes.readOnly = true;
                }
            },

            saveClientChanges: async () => {
                const client = app.state.currentClient;
                if (!client) return;
                client.nome = app.selectors.editNome.value;
                client.assunto = app.selectors.editAssunto.value;
                client['e-mail'] = app.selectors.editEmail.value;
                client.Empresa = app.selectors.editEmpresa.value;
                client.Cargo = app.selectors.editCargo.value;
                client.prioridade = app.selectors.editPrioridade.value;
                client.observacoes = app.selectors.modalClientObservacoes.value; // Observações are always editable

                // Salva a data de agendamento a partir do campo de edição
                const novaDataAgendada = app.selectors.editDataCadastro.value;
                client.dataAgendada = novaDataAgendada ? new Date(novaDataAgendada + 'T12:00:00.000Z').toISOString() : null;

                await app.api.updateClient(client);
                app.ui.renderAll();
                // Reabre o modal com os dados atualizados e no modo de visualização
                app.events.toggleEditMode(false); // Garante que volte para o modo de detalhes
                app.events.openClientDetailModal(client);
            },

            deleteClientFromModal: async () => {
                const client = app.state.currentClient;
                if (client && confirm(`Tem certeza que deseja excluir o cliente ${client.nome}?`)) {
                    await app.api.deleteClient(client.numero);
                    app.ui.renderAll();
                    app.events.closeClientDetailModal();
                    app.ui.showToast(`Cliente ${client.nome} excluído com sucesso!`, 'success');
                }
            },

            openCalendarModal: (client) => {
                app.state.currentClient = client;
                app.state.calendarSelectedDate = client.dataAgendada ? app.utils.parseDate(client.dataAgendada) : new Date();
            
                // Seleciona o container do calendário dentro do modal e o limpa
                const calendarContainer = app.selectors.calendarContainer;
                calendarContainer.innerHTML = ''; // Garante que o conteúdo anterior seja removido
                calendarContainer.className = 'inline-calendar'; // Aplica a classe para o estilo que criamos
            
                // Cria o calendário customizado dentro do container
                app.ui.createCustomCalendar(
                    calendarContainer,
                    app.state.calendarSelectedDate,
                    async (selectedDate) => { // Esta função é chamada quando um dia é clicado
                        if (!selectedDate) return;
            
                        client.dataAgendada = selectedDate.toISOString();
                        await app.api.updateClient(client);
                        app.ui.showToast(`Agendamento para ${client.nome} salvo!`, 'success');
                        app.ui.renderAll(); // Atualiza a UI para refletir a nova data
                        app.ui.toggleModal(app.selectors.calendarModalOverlay, false); // Fecha o modal após a seleção
                    }
                );
            
                app.ui.toggleModal(app.selectors.calendarModalOverlay, true);
            },
        },

        // 8. INITIALIZATION & EVENT LISTENERS SETUP
        init: async () => {
            app.cacheSelectors = () => {
                app.selectors = {
                    body: document.body,
                    logoButton: document.getElementById('logo-button'),
                    aboutModal: document.getElementById('about-modal'),
                    closeAboutModalButtons: document.querySelectorAll('[data-close-about-modal]'),
                    themeToggleButton: document.getElementById('theme-toggle-button'),
                    tabButtons: document.querySelectorAll('.tab-button'),
                    tabContents: document.querySelectorAll('.tab-content'),
                    subTabButtons: document.querySelectorAll('.sub-tab-button'),
                    subTabContents: document.querySelectorAll('.sub-tab-content'),
                    searchInput: document.getElementById('search-input'),
                    searchButton: document.getElementById('botao-busca'),
                    searchIcon: document.querySelector('.search-icon'),
                    cardContainer: document.getElementById('client-card-container'),
                    clientControls: document.getElementById('client-controls'),
                    addContactForm: document.getElementById('form-adicionar-contato'),
                    clientDetailModal: document.getElementById('client-detail-modal'),
                    modalContent: document.querySelector('#client-detail-modal .modal-content'),
                    closeModalButton: document.querySelector('#client-detail-modal .close-button'),
                    toastContainer: document.getElementById('toast-notification-container'),
                    priorityFilterButtons: document.querySelectorAll('.filter-btn'),
                    sortSelect: document.getElementById('sort-select'),
                    loadingSpinner: document.getElementById('loading-spinner'),
                    modalClientName: document.getElementById('modal-client-name'),
                    modalClientAssunto: document.getElementById('modal-client-assunto'),
                    modalClientNumero: document.getElementById('modal-client-numero'),
                    modalClientEmail: document.getElementById('modal-client-email'),
                    modalClientEmpresa: document.getElementById('modal-client-empresa'),
                    modalClientCargo: document.getElementById('modal-client-cargo'),
                    modalClientPrioridade: document.getElementById('modal-client-prioridade'),
                    modalClientDataCadastro: document.getElementById('modal-client-data-cadastro'), // Detalhes
                    modalClientObservacoes: document.getElementById('modal-client-observacoes'),
                    modalDetails: document.querySelector('.modal-details'),
                    modalEditForm: document.querySelector('.modal-edit-form'),
                    editNome: document.getElementById('edit-nome'),
                    editAssunto: document.getElementById('edit-assunto'),
                    editEmail: document.getElementById('edit-email'),
                    editEmpresa: document.getElementById('edit-empresa'),
                    editCargo: document.getElementById('edit-cargo'),
                    editDataCadastro: document.getElementById('edit-data-cadastro'),
                    editPrioridade: document.getElementById('edit-prioridade'),
                    editClientButton: document.getElementById('edit-client-button'),
                    saveClientButton: document.getElementById('save-client-button'),
                    deleteClientButton: document.getElementById('delete-client-button'),
                    calendarModalOverlay: document.getElementById('calendar-modal-overlay'),
                    calendarModalContent: document.querySelector('#calendar-modal-overlay .modal-content'), // Seletor mais específico
                    calendarContainer: document.getElementById('calendar-container'),
                    calendarCloseButton: document.querySelector('#calendar-modal-overlay .close-button'),
                    listaAgendamentosInicio: document.getElementById('lista-agendamentos-inicio'),
                    inicioTabContent: document.getElementById('inicio'),
                    agendamentosSubTabContent: document.getElementById('agendamentos'),
                    calendarTabButton: document.querySelector('.tab-button[data-tab="calendario"]'),
                    calendarTabContent: document.getElementById('calendario'),
                    whiteboardCalendarContainer: document.getElementById('whiteboard-calendar-container'),
                    prevMonthButton: document.getElementById('prev-month-button'),
                    nextMonthButton: document.getElementById('next-month-button'),
                    currentMonthYearDisplay: document.getElementById('current-month-year'),
                    addNoteButton: document.getElementById('add-note-button'),
                    noteModal: document.getElementById('note-modal'),
                    noteModalCloseButton: document.querySelector('#note-modal .close-button'),
                    noteDateDisplay: document.getElementById('note-date-display'),
                    noteTextInput: document.getElementById('note-text-input'),
                    saveNoteButton: document.getElementById('save-note-button'),
                    deleteNoteButton: document.getElementById('delete-note-button'),
                };
            };

            app.cacheSelectors();

            // Melhora os campos de data, transformando-os em seletores de data nativos
            if (app.selectors.editDataCadastro) {
                app.selectors.editDataCadastro.type = 'date';
            }
            const addDataCadastroInput = app.selectors.addContactForm.querySelector('[name="dataCadastro"]');
            if (addDataCadastroInput) {
                addDataCadastroInput.type = 'date';
            }
            
            // Adiciona estilo para garantir que o texto do seletor de data seja branco
            const style = document.createElement('style');
            style.textContent = `
                input[type="date"] {
                    color: #ffffff;
                }
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                }
            `;
            document.head.appendChild(style);

            app.theme.applyTheme(app.state.currentTheme);
            app.selectors.themeToggleButton.addEventListener('click', app.theme.toggleTheme);
            app.selectors.tabButtons.forEach(button => {
                button.addEventListener('click', () => app.events.handleTabClick(button.dataset.tab));
            });
            document.querySelector('.tab-button[data-tab="inicio"]').classList.add('active');
            document.getElementById('inicio').classList.add('active');
            app.selectors.subTabButtons.forEach(button => {
                button.addEventListener('click', () => app.events.handleSubTabClick(button.dataset.subtab));
            });
            document.querySelector('.sub-tab-button[data-subtab="geral"]').classList.add('active');
            document.getElementById('geral').classList.add('active');
            
            // Eventos de busca
            app.selectors.searchInput.addEventListener('input', app.events.handleSearchInput);
            // Adiciona a busca ao pressionar "Enter" no campo de busca
            app.selectors.searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') app.events.handleSearch();
            });
            app.selectors.priorityFilterButtons.forEach(button => {
                button.addEventListener('click', () => app.events.handlePriorityFilter(button));
            });
            document.querySelector('.filter-btn[data-priority="Todos"]').classList.add('active');

            const priorityFiltersContainer = document.querySelector('.priority-filters');
            if (priorityFiltersContainer && !document.getElementById('clear-filters-btn')) {
                const clearButton = document.createElement('button');
                clearButton.textContent = 'Limpar Filtros';
                clearButton.className = 'button-secondary';
                clearButton.id = 'clear-filters-btn';
                clearButton.addEventListener('click', app.events.clearFilters);
                priorityFiltersContainer.appendChild(clearButton);
            }

            // CORREÇÃO: Mover a configuração do sortSelect para depois da criação do botão.
            app.selectors.sortSelect.addEventListener('change', app.events.handleSort);
            app.selectors.prevMonthButton.addEventListener('click', app.events.handlePrevMonth);
            app.selectors.nextMonthButton.addEventListener('click', app.events.handleNextMonth);
            app.selectors.addNoteButton.addEventListener('click', () => app.events.openNoteModal(app.utils.formatDateToISO(new Date())));
            app.selectors.noteModalCloseButton.addEventListener('click', () => app.ui.toggleModal(app.selectors.noteModal, false));
            app.selectors.saveNoteButton.addEventListener('click', app.events.saveNote);
            app.selectors.deleteNoteButton.addEventListener('click', app.events.deleteNote);
            app.selectors.calendarCloseButton.addEventListener('click', () => app.ui.toggleModal(app.selectors.calendarModalOverlay, false));
            app.selectors.calendarModalOverlay.addEventListener('click', (e) => {
                if (e.target === app.selectors.calendarModalOverlay) app.ui.toggleModal(app.selectors.calendarModalOverlay, false);
            });
            app.selectors.addContactForm.addEventListener('submit', app.events.handleAddContactSubmit);

            app.events.setupEventListeners();
            app.events.setupModalEventListeners();
            app.events.handleAboutModal();

            await app.api.fetchClients();
            app.ui.renderAll();
        },
    };

    document.addEventListener('DOMContentLoaded', app.init);
})();
