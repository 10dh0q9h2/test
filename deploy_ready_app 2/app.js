// DeutschLernen — Application Logic

document.addEventListener('DOMContentLoaded', () => {
  // --- Global Application State ---
  let vocabData = [];
  let grammarData = [];
  let textData = [];
  let quizData = [];
  let aiQuizzes = [];
  
  let currentTextLektionIndex = 0;
  let currentVocabCardIndex = 0;
  let filteredVocabCards = [];
  
  // Progress states (persisted in localStorage)
  let userProgress = {
    learnedWords: {}, // wordDe -> boolean
    solvedQuizzes: {}, // quizId (chapter-ubung) -> score percentage
  };
  
  // AI Quizzes Persistence
  const loadAiQuizzes = () => {
    const saved = localStorage.getItem('deutschLernen_aiQuizzes');
    if (saved) {
      try {
        aiQuizzes = JSON.parse(saved);
      } catch (e) {
        aiQuizzes = [];
      }
    }
  };
  const saveAiQuizzes = () => {
    localStorage.setItem('deutschLernen_aiQuizzes', JSON.stringify(aiQuizzes));
  };
  
  // AI Dictionary Cache Persistence
  let aiDictCache = {};
  const loadAiDictCache = () => {
    const saved = localStorage.getItem('deutschLernen_aiDict');
    if (saved) {
      try {
        aiDictCache = JSON.parse(saved);
      } catch (e) {
        aiDictCache = {};
      }
    }
  };
  const saveAiDictCache = () => {
    localStorage.setItem('deutschLernen_aiDict', JSON.stringify(aiDictCache));
  };
  
  let contextDict = {};
  let textTranslations = {};
  const loadTextTranslations = () => {
    const saved = localStorage.getItem('deutschLernen_textTranslations');
    if (saved) {
      try {
        textTranslations = JSON.parse(saved);
      } catch (e) {
        textTranslations = {};
      }
    }
  };
  const saveTextTranslations = () => {
    localStorage.setItem('deutschLernen_textTranslations', JSON.stringify(textTranslations));
  };
  
  // TTS (Text-to-Speech) settings
  let ttsDeVoice = null;
  let ttsRate = 0.9;
  
  // Load progress from localStorage
  const loadUserProgress = () => {
    const saved = localStorage.getItem('deutsch_lernen_progress');
    if (saved) {
      try {
        userProgress = JSON.parse(saved);
        if (!userProgress.learnedWords) userProgress.learnedWords = {};
        if (!userProgress.solvedQuizzes) userProgress.solvedQuizzes = {};
      } catch (e) {
        console.error('Error parsing progress', e);
      }
    }
  };
  
  const saveUserProgress = () => {
    localStorage.setItem('deutsch_lernen_progress', JSON.stringify(userProgress));
    updateDashboardProgress();
  };
  
  // --- DOM Elements ---
  const tabButtons = document.querySelectorAll('.nav-menu .nav-item');
  const pageSections = document.querySelectorAll('.page-section');
  const themeToggle = document.getElementById('theme-toggle');
  const loadStatusText = document.getElementById('load-status');
  const loadStatusDot = document.querySelector('.status-indicator .dot');
  const globalSearchInput = document.getElementById('global-search');
  
  // Dashboard elements
  const statTotalVocab = document.getElementById('stat-total-vocab');
  const statTotalGrammar = document.getElementById('stat-total-grammar');
  const statTotalTexts = document.getElementById('stat-total-texts');
  const statTotalQuizzes = document.getElementById('stat-total-quizzes');
  const chapterListContainer = document.getElementById('chapter-list-container');
  const progressVocabBar = document.getElementById('progress-vocab');
  const progressVocabText = document.getElementById('progress-vocab-text');
  const progressQuizBar = document.getElementById('progress-quiz');
  const progressQuizText = document.getElementById('progress-quiz-text');
  
  // Vocab Page elements
  const btnVocabList = document.getElementById('btn-vocab-list');
  const btnVocabCard = document.getElementById('btn-vocab-card');
  const vocabListContainer = document.getElementById('vocab-list-container');
  const vocabCardContainer = document.getElementById('vocab-card-container');
  const selectVocabChapter = document.getElementById('select-vocab-chapter');
  const selectVocabStatus = document.getElementById('select-vocab-status');
  const vocabLearnedCount = document.getElementById('vocab-learned-count');
  
  // Flashcard elements
  const flashcard = document.getElementById('flashcard');
  const cardGroup = document.getElementById('card-group');
  const cardWordDe = document.getElementById('card-word-de');
  const cardWordKr = document.getElementById('card-word-kr');
  const cardNote = document.getElementById('card-note');
  const btnCardTts = document.getElementById('btn-card-tts');
  const btnCardToggleLearned = document.getElementById('btn-card-toggle-learned');
  const btnPrevCard = document.getElementById('btn-prev-card');
  const btnNextCard = document.getElementById('btn-next-card');
  const cardIndicator = document.getElementById('card-indicator');
  
  // Grammar elements
  const grammarNavContainer = document.getElementById('grammar-nav-container');
  const grammarContentContainer = document.getElementById('grammar-content-container');
  
  // Text elements
  const selectTextChapter = document.getElementById('select-text-chapter');
  const dialogPanelContainer = document.getElementById('dialog-panel-container');
  const btnPrevText = document.getElementById('btn-prev-text');
  const btnNextText = document.getElementById('btn-next-text');
  
  // Quiz elements
  const selectQuizChapter = document.getElementById('select-quiz-chapter');
  const quizListContainer = document.getElementById('quiz-list-container');
  const quizTitle = document.getElementById('quiz-title');
  const quizDescription = document.getElementById('quiz-description');
  const quizBodyContainer = document.getElementById('quiz-body-container');
  const quizFooterContainer = document.getElementById('quiz-footer-container');
  const quizScorePanel = document.getElementById('quiz-score-panel');
  const quizScoreText = document.getElementById('quiz-score-text');
  const btnQuizReset = document.getElementById('btn-quiz-reset');
  const btnQuizSubmit = document.getElementById('btn-quiz-submit');
  
  // TTS Modal elements
  const btnTtsSettings = document.getElementById('btn-tts-settings');
  const modalTtsSettings = document.getElementById('modal-tts-settings');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const selectTtsDeVoice = document.getElementById('select-tts-de-voice');
  const selectTtsRate = document.getElementById('select-tts-rate');
  const ttsRateVal = document.getElementById('tts-rate-val');
  const btnTestTts = document.getElementById('btn-test-tts');
  
  // --- Navigation & Theme Toggle ---
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  const switchTab = (tabId) => {
    tabButtons.forEach(b => b.classList.remove('active'));
    pageSections.forEach(s => s.classList.remove('active'));
    
    const activeBtn = document.querySelector(`.nav-menu [data-tab="${tabId}"]`);
    const activeSection = document.getElementById(`page-${tabId}`);
    
    if (activeBtn) activeBtn.classList.add('active');
    if (activeSection) activeSection.classList.add('active');
  };
  
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.innerHTML = isLight 
      ? '<i class="fa-solid fa-sun"></i><span>라이트 모드</span>' 
      : '<i class="fa-solid fa-moon"></i><span>다크 모드</span>';
  });
  
  // --- TTS Initialization & Settings ---
  const initTTS = () => {
    if (!('speechSynthesis' in window)) {
      console.warn('TTS is not supported in this browser.');
      return;
    }
    
    const populateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      selectTtsDeVoice.innerHTML = '';
      
      const deVoices = voices.filter(voice => voice.lang.startsWith('de'));
      
      if (deVoices.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = '독일어 음성 지원 안됨 (브라우저 기본 사용)';
        opt.value = '';
        selectTtsDeVoice.appendChild(opt);
      } else {
        deVoices.forEach(voice => {
          const opt = document.createElement('option');
          opt.textContent = `${voice.name} (${voice.lang})`;
          opt.value = voice.name;
          // Prefer Google Deutsch or high quality voices
          if (voice.name.includes('Google') || voice.name.includes('Natural')) {
            opt.selected = true;
            ttsDeVoice = voice;
          }
          selectTtsDeVoice.appendChild(opt);
        });
        
        if (!ttsDeVoice && deVoices.length > 0) {
          ttsDeVoice = deVoices[0];
        }
      }
    };
    
    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  };
  
  const speakGerman = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop playing previous audio
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = ttsRate;
    
    if (ttsDeVoice) {
      utterance.voice = ttsDeVoice;
    } else {
      // Fallback: search for any german voice dynamically
      const voices = window.speechSynthesis.getVoices();
      const deVoice = voices.find(v => v.lang.startsWith('de'));
      if (deVoice) utterance.voice = deVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };
  
  // TTS Settings Events
  btnTtsSettings.addEventListener('click', () => {
    modalTtsSettings.classList.add('active');
  });
  
  btnCloseModal.addEventListener('click', () => {
    modalTtsSettings.classList.remove('active');
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === modalTtsSettings) {
      modalTtsSettings.classList.remove('active');
    }
  });
  
  selectTtsDeVoice.addEventListener('change', () => {
    const voiceName = selectTtsDeVoice.value;
    const voices = window.speechSynthesis.getVoices();
    ttsDeVoice = voices.find(v => v.name === voiceName) || null;
  });
  
  selectTtsRate.addEventListener('input', () => {
    ttsRate = parseFloat(selectTtsRate.value);
    ttsRateVal.textContent = `${ttsRate.toFixed(1)}x`;
  });
  
  btnTestTts.addEventListener('click', () => {
    speakGerman("Hallo Hana! Wie geht es dir aujourd'hui? Es freut mich, dich zu sehen.");
  });
  
  // --- Data Parsers ---
  
  const parseVocabulary = (mdText) => {
    const lines = mdText.split('\n');
    const parsed = [];
    let currentChapter = '빠른 암기표';
    let currentGroup = '기본';
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      if (trimmed.startsWith('## ')) {
        // Strip numbers e.g. "1. 빠른 암기표" -> "빠른 암기표"
        currentChapter = trimmed.replace('## ', '').trim();
      } else if (trimmed.startsWith('### ')) {
        currentGroup = trimmed.replace('### ', '').trim();
      } else if (trimmed.startsWith('#### ')) {
        currentGroup = trimmed.replace('#### ', '').trim();
      } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (trimmed.includes(':---') || trimmed.includes('단어/표현') || trimmed.includes('모음') || trimmed.includes('복모음') || trimmed.includes('자음')) return;
        const parts = trimmed.split('|').map(p => p.trim());
        if (parts.length >= 4) {
          const word = parts[1];
          const meaning = parts[2];
          const note = parts[3] || '';
          if (word && meaning) {
            parsed.push({
              id: `vocab-${parsed.length}`,
              chapter: currentChapter,
              group: currentGroup,
              word,
              meaning,
              note
            });
          }
        }
      }
    });
    return parsed;
  };
  
  const parseGrammar = (mdText) => {
    const sections = mdText.split(/(?=## )/);
    const parsed = [];
    sections.forEach(sec => {
      const clean = sec.trim();
      if (!clean) return;
      const lines = clean.split('\n');
      const title = lines[0].replace('## ', '').trim();
      const content = lines.slice(1).join('\n').trim();
      parsed.push({
        id: `grammar-${parsed.length}`,
        title,
        content
      });
    });
    return parsed;
  };
  
  const renderGrammarMarkdown = (md) => {
    let html = md;
    
    // Parse tables
    const tableRegex = /\|([^\n]+)\|\r?\n\|([:\-\s|]+)\|\r?\n((?:\|[^\n]+\|\r?\n?)*)/g;
    html = html.replace(tableRegex, (match, header, separator, rows) => {
      const headers = header.split('|').map(h => h.trim()).filter(h => h !== '');
      let tableHtml = '<div class="table-container"><table><thead><tr>';
      headers.forEach(h => {
        tableHtml += `<th>${h}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';
      
      const rowLines = rows.trim().split('\n');
      rowLines.forEach(row => {
        if (!row.trim()) return;
        const cols = row.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableHtml += '<tr>';
        cols.forEach(c => {
          // Highlight bold
          const cellText = c.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          tableHtml += `<td>${cellText}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    });
    
    // Callouts: bold titles e.g. > **발음 및 철자 주의사항**
    const calloutHeaderRegex = /^>\s?\*\*([^*]+)\*\*\r?\n((?:>\s?.*(?:\r?\n|$))*)/gm;
    html = html.replace(calloutHeaderRegex, (match, title, body) => {
      const cleanBody = body.replace(/^>\s?/gm, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').trim();
      return `<div class="callout callout-tip"><strong>${title}</strong><p>${cleanBody}</p></div>`;
    });
    
    // Simple callouts
    html = html.replace(/^>\s?(.*)$/gm, '<div class="callout callout-info"><p>$1</p></div>');
    
    // Collapse adjacent callout-infos
    html = html.replace(/<\/div>\s*<div class="callout callout-info">/g, '<br>');
    
    // Headers
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
    
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Lists
    html = html.replace(/^\s*-\s(.*)$/gm, '<li>$1</li>');
    
    // Paragraphs
    const blocks = html.split(/\n\n+/);
    html = blocks.map(b => {
      const trimmed = b.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<div') || trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<hr')) {
        return trimmed;
      }
      if (trimmed.startsWith('<li>')) {
        return `<ul>${trimmed}</ul>`;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
    
    html = html.replace(/---/g, '<hr class="hr-divider">');
    return html;
  };
  
  const parseTexts = (mdText) => {
    const sections = mdText.split(/(?=## Lektion )/);
    const parsed = [];
    
    sections.forEach(sec => {
      const clean = sec.trim();
      if (!clean) return;
      const lines = clean.split('\n');
      const title = lines[0].replace('## ', '').trim();
      const contents = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        if (line.startsWith('*') && line.endsWith('*')) {
          contents.push({
            type: 'narration',
            text: line.replace(/\*/g, '')
          });
        } else if (line.startsWith('**') && line.includes(':**')) {
          const match = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
          if (match) {
            contents.push({
              type: 'dialog',
              speaker: match[1].trim(),
              text: match[2].trim()
            });
          }
        } else if (line.startsWith('>')) {
          contents.push({
            type: 'note',
            text: line.replace(/^>\s?/, '').replace(/\*\*/g, '')
          });
        } else if (line.startsWith('- ')) {
          contents.push({
            type: 'list-item',
            text: line.replace(/^- /, '')
          });
        } else if (line.startsWith('### ')) {
          contents.push({
            type: 'subtitle',
            text: line.replace('### ', '').trim()
          });
        } else if (line.startsWith('|')) {
          contents.push({
            type: 'table-line',
            text: line
          });
        } else if (line === '---') {
          // divider
        } else {
          contents.push({
            type: 'text',
            text: line
          });
        }
      }
      
      // Buffer consecutive table lines
      const processed = [];
      let tableLines = [];
      contents.forEach(item => {
        if (item.type === 'table-line') {
          tableLines.push(item.text);
        } else {
          if (tableLines.length > 0) {
            processed.push({
              type: 'table',
              text: tableLines.join('\n')
            });
            tableLines = [];
          }
          processed.push(item);
        }
      });
      if (tableLines.length > 0) {
        processed.push({
          type: 'table',
          text: tableLines.join('\n')
        });
      }
      
      parsed.push({
        id: `text-${parsed.length}`,
        title,
        contents: processed
      });
    });
    return parsed;
  };
  
  const parseQuizzes = (mdText) => {
    // 1. Separate questions and solutions
    const parts = mdText.split('## 정답 (Lösungen)');
    const quizSection = parts[0];
    const solutionSection = parts[1] || '';
    
    // 2. Parse solutions
    const solutions = {}; // chapterNum -> { ubungIdx -> [answers] }
    const solChapters = solutionSection.split(/\n(?=### )/);
    
    solChapters.forEach(ch => {
      const chClean = ch.trim();
      if (!chClean) return;
      const lines = chClean.split('\n');
      const chMatch = lines[0].match(/###\s*(\d+)장/);
      if (chMatch) {
        const chNum = chMatch[1];
        if (!solutions[chNum]) solutions[chNum] = {};
        
        lines.slice(1).forEach(line => {
          const item = line.trim();
          if (item.startsWith('*')) {
            const solMatch = item.match(/\*\*\s*Übung\s*(\d+)\s*:\*\*\s*(.*)$/i);
            if (solMatch) {
              const uNum = solMatch[1];
              const ansText = solMatch[2];
              // Split by / and clean
              const rawAnswers = ansText.split('/').map(a => a.trim());
              // Flat split by comma for multiple blanks per line
              const cleanedAnswers = [];
              rawAnswers.forEach(ans => {
                if (ans.includes(',') && !ans.includes('(')) {
                  ans.split(',').forEach(subAns => cleanedAnswers.push(subAns.trim()));
                } else {
                  cleanedAnswers.push(ans);
                }
              });
              solutions[chNum][uNum] = cleanedAnswers;
            }
          }
        });
      }
    });
    
    // 3. Parse exercises
    const chapters = quizSection.split(/\n(?=## )/);
    const parsedQuizzes = [];
    
    chapters.forEach(ch => {
      const chClean = ch.trim();
      if (!chClean) return;
      const lines = chClean.split('\n');
      const chTitle = lines[0].replace('## ', '').trim();
      const chMatch = chTitle.match(/^(\d+)장/);
      const chNum = chMatch ? chMatch[1] : null;
      
      const ubungen = chClean.split(/\n(?=#{3,4}\s*(?:Übung|Aktivität))/);
      ubungen.slice(1).forEach(ubung => {
        const uLines = ubung.trim().split('\n');
        const uTitle = uLines[0].replace(/^#+\s*/, '').trim();
        const uMatch = uTitle.match(/(?:Übung|Aktivität)\s*(\d+)?/i);
        
        // For Aktivität or sections without numbers, we create a fallback ID
        const isAktivitat = uTitle.toLowerCase().includes('aktivität');
        const uNum = uMatch && uMatch[1] ? uMatch[1] : (isAktivitat ? 'Aktivität' : null);
        
        const questions = [];
        let vocabOptions = []; // For select list matching if provided, e.g. "Übung 1 (beruflich, beschäftigt...)"
        const optMatch = uTitle.match(/\(([^)]+)\)/);
        if (optMatch && !isAktivitat) {
          vocabOptions = optMatch[1].split(',').map(o => o.trim());
        }
        
        uLines.slice(1).forEach(line => {
          const qLine = line.trim();
          if (!qLine) return;
          
          if (qLine.startsWith('- ')) {
            // Informational items e.g. chapter 1
            questions.push({
              type: 'info',
              text: qLine.replace('- ', '')
            });
          } else if (qLine.match(/^\d+\./)) {
            // Actual blank fill questions
            const qMatch = qLine.match(/^(\d+)\.\s*(.*)$/);
            if (qMatch) {
              const num = qMatch[1];
              const text = qMatch[2];
              questions.push({
                type: 'blank',
                number: num,
                text: text
              });
            }
          } else {
            // General text
            questions.push({
              type: 'label',
              text: qLine
            });
          }
        });
        
        // Find matched answers
        let matchedAnswers = null;
        if (chNum && uNum && solutions[chNum] && solutions[chNum][uNum]) {
          matchedAnswers = solutions[chNum][uNum];
        }
        
        // Sometimes Chapter 12 has multiple sections with the same Übung number (e.g. Grammatik, Wortschatz).
        // If we encounter a duplicate uNum, append a suffix.
        let finalUNum = uNum || 'info';
        if (parsedQuizzes.find(q => q.chapterNum === chNum && q.ubungNum === finalUNum)) {
           finalUNum += '-' + Math.random().toString(36).substr(2, 4);
        }
        
        parsedQuizzes.push({
          id: `quiz-${chNum}-${finalUNum}`,
          chapterNum: chNum,
          chapterTitle: chTitle,
          ubungNum: finalUNum,
          title: uTitle,
          questions: questions,
          options: vocabOptions,
          answers: matchedAnswers
        });
      });
    });
    
    return parsedQuizzes;
  };
  
  // --- Dashboard Renderer ---
  const renderDashboard = () => {
    statTotalVocab.textContent = vocabData.length;
    statTotalGrammar.textContent = grammarData.length;
    statTotalTexts.textContent = textData.length;
    statTotalQuizzes.textContent = quizData.length;
    
    // Fill chapter list
    chapterListContainer.innerHTML = '';
    
    // Extract unique Lektionen/Chapters from texts and quizzes
    const uniqueChapters = [];
    textData.forEach(t => {
      uniqueChapters.push({
        id: t.id,
        title: t.title,
        type: 'text',
        tab: 'texts'
      });
    });
    
    uniqueChapters.forEach((ch, idx) => {
      const btn = document.createElement('button');
      btn.className = 'chapter-card-btn';
      btn.innerHTML = `
        <div class="ch-info">
          <h4>${ch.title}</h4>
          <span>학습 본문 및 대화</span>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      `;
      btn.addEventListener('click', () => {
        currentTextLektionIndex = idx;
        renderActiveText();
        switchTab('texts');
      });
      chapterListContainer.appendChild(btn);
    });
    
    updateDashboardProgress();
  };
  
  const updateDashboardProgress = () => {
    // Vocab progress
    const totalVocab = vocabData.length;
    if (totalVocab > 0) {
      const learnedCount = Object.keys(userProgress.learnedWords).filter(k => userProgress.learnedWords[k]).length;
      const vocabPercent = Math.round((learnedCount / totalVocab) * 100);
      progressVocabBar.style.width = `${vocabPercent}%`;
      progressVocabText.textContent = `${learnedCount}/${totalVocab} 암기 완료 (${vocabPercent}%)`;
      vocabLearnedCount.textContent = `${learnedCount} / ${totalVocab}`;
    }
    
    // Quiz progress
    const totalQuizzes = quizData.filter(q => q.answers && q.answers.length > 0).length;
    if (totalQuizzes > 0) {
      const solvedKeys = Object.keys(userProgress.solvedQuizzes);
      const avgScore = solvedKeys.length > 0 
        ? Math.round(solvedKeys.reduce((acc, k) => acc + userProgress.solvedQuizzes[k], 0) / totalQuizzes)
        : 0;
      progressQuizBar.style.width = `${Math.min(avgScore, 100)}%`;
      progressQuizText.textContent = `${solvedKeys.length}/${totalQuizzes} 해결 완료 (평균 점수: ${avgScore}%)`;
    }
  };
  
  // --- Vocabulary Tab Renderer ---
  const populateVocabFilters = () => {
    const chapters = [...new Set(vocabData.map(v => v.chapter))];
    selectVocabChapter.innerHTML = '<option value="all">전체보기</option>';
    chapters.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch;
      opt.textContent = ch;
      selectVocabChapter.appendChild(opt);
    });
  };
  
  const renderVocabList = () => {
    vocabListContainer.innerHTML = '';
    const chFilter = selectVocabChapter.value;
    const statusFilter = selectVocabStatus.value;
    
    const filtered = vocabData.filter(v => {
      const matchCh = (chFilter === 'all' || v.chapter === chFilter);
      const isLearned = !!userProgress.learnedWords[v.word];
      const matchStatus = (statusFilter === 'all' || 
                           (statusFilter === 'learned' && isLearned) || 
                           (statusFilter === 'unlearned' && !isLearned));
      return matchCh && matchStatus;
    });
    
    if (filtered.length === 0) {
      vocabListContainer.innerHTML = `
        <div class="empty-state" style="grid-column: span 3; padding: 40px 0;">
          <i class="fa-solid fa-folder-open"></i>
          <p>필터에 맞는 단어가 없습니다.</p>
        </div>
      `;
      return;
    }
    
    filtered.forEach(v => {
      const isLearned = !!userProgress.learnedWords[v.word];
      const card = document.createElement('div');
      card.className = `vocab-item-card ${isLearned ? 'learned' : ''}`;
      card.innerHTML = `
        <div class="vocab-card-header">
          <span class="vocab-category">${v.group}</span>
          <button class="vocab-learned-btn" title="${isLearned ? '미암기로 변경' : '암기 완료로 변경'}">
            <i class="${isLearned ? 'fa-solid' : 'fa-regular'} fa-circle-check"></i>
          </button>
        </div>
        <h4 class="vocab-word-de">
          ${v.word}
          <button class="vocab-sound-btn" title="발음 듣기"><i class="fa-solid fa-volume-high"></i></button>
        </h4>
        <p class="vocab-word-kr">${v.meaning}</p>
        ${v.note ? `<span class="vocab-note">${v.note}</span>` : ''}
      `;
      
      // Toggle learned
      card.querySelector('.vocab-learned-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        userProgress.learnedWords[v.word] = !userProgress.learnedWords[v.word];
        saveUserProgress();
        renderVocabList();
      });
      
      // Speak TTS
      card.querySelector('.vocab-sound-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        // Speak clean German word (strip parentheses or symbols)
        const cleanWord = v.word.split(',')[0].split('/')[0].trim();
        speakGerman(cleanWord);
      });
      
      vocabListContainer.appendChild(card);
    });
  };
  
  // Flashcard View Mode Handler
  const updateFilteredVocabCards = () => {
    const chFilter = selectVocabChapter.value;
    filteredVocabCards = vocabData.filter(v => {
      return (chFilter === 'all' || v.chapter === chFilter);
    });
    currentVocabCardIndex = 0;
  };

  const renderVocabFlashcard = () => {
    
    if (filteredVocabCards.length === 0) {
      cardWordDe.textContent = '단어 없음';
      cardWordKr.textContent = '단어가 없습니다.';
      cardNote.textContent = '';
      cardIndicator.textContent = '0 / 0';
      return;
    }
    
    if (currentVocabCardIndex >= filteredVocabCards.length) {
      currentVocabCardIndex = 0;
    }
    
    const v = filteredVocabCards[currentVocabCardIndex];
    const isLearned = !!userProgress.learnedWords[v.word];
    
    // Fill Card Contents
    cardGroup.textContent = v.group;
    cardWordDe.textContent = v.word;
    cardWordKr.textContent = v.meaning;
    cardNote.textContent = v.note || '비고 없음';
    cardIndicator.textContent = `카드 ${currentVocabCardIndex + 1} / ${filteredVocabCards.length}`;
    
    // Toggle button style
    btnCardToggleLearned.textContent = isLearned ? '암기 해제' : '암기 완료 표시';
    btnCardToggleLearned.className = isLearned ? 'btn btn-secondary' : 'btn btn-primary';
    
    // Reset flip status
    flashcard.classList.remove('flipped');
  };
  
  // Flashcard Carousel Navigation
  flashcard.addEventListener('click', (e) => {
    // Don't flip when clicking TTS or buttons
    if (e.target.closest('#btn-card-tts') || e.target.closest('#btn-card-toggle-learned')) return;
    flashcard.classList.toggle('flipped');
  });
  
  btnCardTts.addEventListener('click', (e) => {
    e.stopPropagation();
    const v = filteredVocabCards[currentVocabCardIndex];
    if (v) speakGerman(v.word.split(',')[0].split('/')[0].trim());
  });
  
  btnCardToggleLearned.addEventListener('click', (e) => {
    e.stopPropagation();
    const v = filteredVocabCards[currentVocabCardIndex];
    if (v) {
      userProgress.learnedWords[v.word] = !userProgress.learnedWords[v.word];
      saveUserProgress();
      renderVocabFlashcard();
    }
  });
  
  btnPrevCard.addEventListener('click', () => {
    if (filteredVocabCards.length > 0) {
      currentVocabCardIndex = (currentVocabCardIndex - 1 + filteredVocabCards.length) % filteredVocabCards.length;
      renderVocabFlashcard();
    }
  });
  
  btnNextCard.addEventListener('click', () => {
    if (filteredVocabCards.length > 0) {
      currentVocabCardIndex = (currentVocabCardIndex + 1) % filteredVocabCards.length;
      renderVocabFlashcard();
    }
  });
  
  const btnShuffleCards = document.getElementById('btn-shuffle-cards');
  if (btnShuffleCards) {
    btnShuffleCards.addEventListener('click', () => {
      if (filteredVocabCards.length > 1) {
        // Fisher-Yates shuffle
        for (let i = filteredVocabCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filteredVocabCards[i], filteredVocabCards[j]] = [filteredVocabCards[j], filteredVocabCards[i]];
        }
        currentVocabCardIndex = 0;
        renderVocabFlashcard();
      }
    });
  }
  
  // Toggle between List and Flashcard view
  btnVocabList.addEventListener('click', () => {
    btnVocabList.classList.add('active');
    btnVocabCard.classList.remove('active');
    vocabListContainer.style.display = 'grid';
    vocabCardContainer.style.display = 'none';
    renderVocabList();
  });
  
  btnVocabCard.addEventListener('click', () => {
    btnVocabCard.classList.add('active');
    btnVocabList.classList.remove('active');
    vocabListContainer.style.display = 'none';
    vocabCardContainer.style.display = 'flex';
    updateFilteredVocabCards();
    renderVocabFlashcard();
  });
  
  selectVocabChapter.addEventListener('change', () => {
    renderVocabList();
    updateFilteredVocabCards();
    renderVocabFlashcard();
  });
  
  selectVocabStatus.addEventListener('change', () => {
    renderVocabList();
  });
  
  // --- Grammar Tab Renderer ---
  const renderGrammar = () => {
    grammarNavContainer.innerHTML = '';
    
    if (grammarData.length === 0) return;
    
    grammarData.forEach((g, idx) => {
      const btn = document.createElement('button');
      btn.className = `grammar-nav-item ${idx === 0 ? 'active' : ''}`;
      btn.innerHTML = `
        <span>${g.title}</span>
        <i class="fa-solid fa-chevron-right"></i>
      `;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.grammar-nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderGrammarContent(g);
      });
      grammarNavContainer.appendChild(btn);
    });
    
    // Render first content as default
    renderGrammarContent(grammarData[0]);
  };
  
  const renderGrammarContent = (grammarObj) => {
    grammarContentContainer.innerHTML = `
      <h2>${grammarObj.title}</h2>
      ${renderGrammarMarkdown(grammarObj.content)}
    `;
    
    // Auto speech trigger for German sentences inside tables or bold items when hovered/clicked
    grammarContentContainer.querySelectorAll('strong').forEach(el => {
      el.style.cursor = 'pointer';
      el.title = '클릭하여 독일어 발음 듣기';
      el.addEventListener('click', () => {
        // Regex check if it has German text
        const text = el.textContent.trim();
        if (/[a-zA-ZäöüßÄÖÜ]/.test(text)) {
          speakGerman(text);
        }
      });
    });
  };
  
  // --- Dictionary Tooltip Helper ---
  let activeDictWord = null;
  const lookupWord = (clickedWord) => {
    const cleanWord = clickedWord.replace(/[^a-zA-ZäöüßÄÖÜ]/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return null;

    let match = vocabData.find(v => v.word.split(',')[0].toLowerCase() === cleanWord);
    if (match) return match;

    const stemMatch = cleanWord.match(/^(.*?)(e|st|t|en|n|s)?$/);
    if (stemMatch) {
      const stem = stemMatch[1];
      if (stem.length >= 3) {
        match = vocabData.find(v => {
            const vBase = v.word.split(',')[0].toLowerCase();
            return vBase === stem || vBase.startsWith(stem);
        });
        if (match) return match;
      }
    }
    
    // Do not use .includes() fallback as it causes false positives (e.g., 'kann' matching 'an').
    // If not found, returning null will trigger the dynamic AI Dictionary.
    return null;
  };

  const wrapWordsInText = (text, contextKey = null) => {
    const ctxAttr = contextKey ? ` data-context="${contextKey.replace(/"/g, '&quot;')}"` : '';
    return text.split(/([^a-zA-ZäöüßÄÖÜ]+)/).map(part => {
      if (/^[a-zA-ZäöüßÄÖÜ]+$/.test(part)) {
        return `<span class="dialog-word"${ctxAttr}>${part}</span>`;
      }
      return part;
    }).join('');
  };

  // let activeDictWord = null; (already declared above or just declare context)
  let activeDictContext = "";
  
  const showDictTooltip = (element, word, context = "") => {
    document.querySelectorAll('.dialog-word.active').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    const match = lookupWord(word);
    const tooltip = document.getElementById('dict-tooltip');
    const dictWordEl = document.getElementById('dict-word');
    const dictMeaningEl = document.getElementById('dict-meaning');
    const dictNoteEl = document.getElementById('dict-note');
    const dictAiBtn = document.getElementById('dict-ai-btn');
    
    // Reset AI Button visibility
    if (dictAiBtn) dictAiBtn.style.display = 'flex';

    let ctxMatch = null;
    if (context && contextDict[context]) {
        if (contextDict[context][word]) {
            ctxMatch = contextDict[context][word];
        } else {
            const key = Object.keys(contextDict[context]).find(k => k.toLowerCase() === word.toLowerCase());
            if (key) ctxMatch = contextDict[context][key];
        }
    }

    if (ctxMatch) {
        dictWordEl.textContent = ctxMatch.base || word;
        dictMeaningEl.textContent = ctxMatch.mean || ctxMatch.meaning || "";
        if (ctxMatch.note) {
            dictNoteEl.textContent = ctxMatch.note;
            dictNoteEl.style.display = 'block';
        } else {
            dictNoteEl.style.display = 'none';
        }
        activeDictWord = ctxMatch.base || word;
        if (dictAiBtn) dictAiBtn.style.display = 'none';
    } else if (match) {
        dictWordEl.textContent = match.word;
        dictMeaningEl.textContent = match.meaning;
        if (match.note) {
            dictNoteEl.textContent = match.note;
            dictNoteEl.style.display = 'block';
        } else {
            dictNoteEl.style.display = 'none';
        }
        activeDictWord = match.word.split(',')[0].split('/')[0].trim();
    } else {
        dictWordEl.textContent = word;
        dictMeaningEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI로 뜻 검색 중...';
        dictNoteEl.style.display = 'none';
        activeDictWord = word;
        activeDictContext = context;
        
        // Dynamic AI Dictionary Fallback
        fetchAIWordMeaning(word, context).then(res => {
            // Check if tooltip is still open for the same word
            if (activeDictWord === word) {
                dictWordEl.textContent = res.baseForm || word;
                dictMeaningEl.textContent = res.meaning;
                if (res.note) {
                    dictNoteEl.textContent = res.note;
                    dictNoteEl.style.display = 'block';
                }
            }
        }).catch(err => {
            if (activeDictWord === word) {
                dictMeaningEl.textContent = "사전 검색 실패 (단어장에 없음)";
            }
        });
    }

    const rect = element.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX - 20;
    
    tooltip.classList.add('active');
    
    setTimeout(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        if (left + tooltipRect.width > window.innerWidth - 20) {
            left = window.innerWidth - tooltipRect.width - 20;
        }
        if (left < 10) left = 10;
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }, 0);
  };

  document.addEventListener('click', (e) => {
      const tooltip = document.getElementById('dict-tooltip');
      
      // 1. If clicked on a word, show tooltip
      if (e.target.classList.contains('dialog-word')) {
          let contextSentence = e.target.getAttribute('data-context');
          if (!contextSentence) {
              contextSentence = e.target.parentNode.textContent.replace(/\s+/g, ' ').trim();
          }
          showDictTooltip(e.target, e.target.textContent, contextSentence);
          return; // Stop here so it doesn't close immediately
      }
      
      // 2. Otherwise, if clicking outside tooltip, close it
      if (tooltip && !tooltip.contains(e.target) && e.target.id !== 'dict-tts' && e.target.parentNode.id !== 'dict-tts') {
          tooltip.classList.remove('active');
          document.querySelectorAll('.dialog-word.active').forEach(el => el.classList.remove('active'));
      }
  });

  const fetchAIWordMeaning = async (word, context = "") => {
    const lowerWord = word.toLowerCase();
    const cacheKey = context ? `${lowerWord}_${context}` : lowerWord;
    
    // 1. Check Cache
    if (aiDictCache[cacheKey]) {
      return aiDictCache[cacheKey];
    }
    
    let prompt;
    if (context) {
      prompt = `독일어 문장: "${context}"
이 문장에서 사용된 단어 '${word}'의 원형(기본형)과 이 문맥에 딱 맞는 한국어 뜻, 그리고 간단한 문법적 특징(예: 존칭 소유대명사, 격 변화 등)을 JSON 형태로 알려줘.
조건:
1. 마크다운 없이 JSON 형식만 출력할 것.
2. 필드: "baseForm" (원형), "meaning" (한국어 뜻), "note" (간단한 설명)`;
    } else {
      prompt = `독일어 문장 속 단어 '${word}'의 원형(기본형)과 가장 많이 쓰이는 한국어 뜻, 그리고 간단한 문법적 특징(예: 조동사, 명사의 성, 변화형 등)을 JSON 형태로 알려줘.
조건:
1. 마크다운 없이 JSON 형식만 출력할 것.
2. 필드: "baseForm" (원형), "meaning" (한국어 뜻), "note" (간단한 설명)

예시:
{
  "baseForm": "müssen",
  "meaning": "~해야 한다",
  "note": "화법조동사 (ich muss, du musst...)"
}`;
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // 툴팁의 빠른 반응속도를 위해 chat 모델 사용
        messages: [
          { role: 'system', content: 'You are a helpful German-Korean dictionary API that outputs only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    });
    
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/^```/, '').replace(/```$/, '').trim();
    }
    
    const result = JSON.parse(content);
    
    // 2. Save to Cache
    aiDictCache[cacheKey] = result;
    saveAiDictCache();
    
    return result;
  };

  document.getElementById('dict-ai-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const dictMeaningEl = document.getElementById('dict-meaning');
      const dictNoteEl = document.getElementById('dict-note');
      const dictWordEl = document.getElementById('dict-word');
      
      dictMeaningEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 문맥 분석 중...';
      dictNoteEl.style.display = 'none';
      
      fetchAIWordMeaning(activeDictWord, activeDictContext).then(res => {
          dictWordEl.textContent = res.baseForm || activeDictWord;
          dictMeaningEl.textContent = res.meaning;
          if (res.note) {
              dictNoteEl.textContent = res.note;
              dictNoteEl.style.display = 'block';
          }
      }).catch(err => {
          if (err.message === 'MISSING_API_KEY') {
              dictMeaningEl.textContent = "우측 상단 ⚙️ 설정에서 API 키를 먼저 입력해주세요.";
          } else {
              dictMeaningEl.textContent = "AI 문맥 검색 실패";
          }
      });
  });

  document.getElementById('dict-tts').addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeDictWord) speakGerman(activeDictWord);
  });

  // --- Texts Tab Renderer ---
  const toggleTextTranslation = document.getElementById('toggle-text-translation');
  const textTranslateStatus = document.getElementById('text-translate-status');
  
  toggleTextTranslation.addEventListener('change', () => {
    textTranslateStatus.textContent = toggleTextTranslation.checked ? '해석 보기' : '해석 안보기';
    renderActiveText();
  });
  
  const populateTextFilters = () => {
    selectTextChapter.innerHTML = '';
    textData.forEach((t, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = t.title;
      selectTextChapter.appendChild(opt);
    });
  };
  
  const fetchChapterTranslations = async (textObj) => {
    // Collect all lines
    const linesToTranslate = textObj.contents.filter(i => i.type === 'narration' || i.type === 'dialog').map(i => i.text);
    if (linesToTranslate.length === 0) return {};
    
    const prompt = `다음은 독일어 교재의 본문 대화입니다. 각 문장을 자연스러운 한국어로 번역하여 JSON 배열 형태로 반환하세요.
원본 배열:
${JSON.stringify(linesToTranslate, null, 2)}

출력 조건:
1. 순서와 개수를 원본과 정확히 일치시킬 것.
2. ["번역문1", "번역문2", ...] 형식의 JSON 배열만 출력할 것. 마크다운(\`\`\`) 없이 출력.`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a professional German to Korean translator. Output valid JSON array only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    });
    
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();
    
    const translatedArray = JSON.parse(content);
    const transDict = {};
    linesToTranslate.forEach((original, idx) => {
      transDict[original] = translatedArray[idx] || "번역 실패";
    });
    return transDict;
  };
  
  const renderActiveText = async () => {
    if (textData.length === 0) return;
    
    selectTextChapter.value = currentTextLektionIndex;
    const textObj = textData[currentTextLektionIndex];
    
    dialogPanelContainer.innerHTML = `
      <div class="chapter-title">
        <h2>${textObj.title}</h2>
        <p>각 대화 말풍선을 탭하면 원어민 발음(TTS)을 들을 수 있습니다.</p>
      </div>
    `;
    
    const showTranslation = toggleTextTranslation.checked;
    
    if (showTranslation && !textTranslations[textObj.title]) {
      dialogPanelContainer.innerHTML += `
        <div style="text-align:center; padding: 20px; color: var(--text-secondary);">
          <i class="fa-solid fa-spinner fa-spin"></i> AI가 전체 본문을 번역 중입니다. 잠시만 기다려주세요... (약 5~10초)
        </div>
      `;
      try {
        const transDict = await fetchChapterTranslations(textObj);
        textTranslations[textObj.title] = transDict;
        saveTextTranslations();
        renderActiveText(); // Re-render with translations
        return;
      } catch (err) {
        alert("본문 번역 중 오류가 발생했습니다.");
        toggleTextTranslation.checked = false;
        textTranslateStatus.textContent = '해석 안보기';
        renderActiveText();
        return;
      }
    }
    
    textObj.contents.forEach(item => {
      if (item.type === 'narration') {
        const div = document.createElement('div');
        div.className = 'dialog-narration';
        div.innerHTML = wrapWordsInText(item.text, item.text);
        if (showTranslation && textTranslations[textObj.title] && textTranslations[textObj.title][item.text]) {
          div.innerHTML += `<div class="dialog-translation">${textTranslations[textObj.title][item.text]}</div>`;
        }
        dialogPanelContainer.appendChild(div);
      } else if (item.type === 'subtitle') {
        const div = document.createElement('div');
        div.className = 'dialog-subtitle';
        div.textContent = item.text;
        dialogPanelContainer.appendChild(div);
      } else if (item.type === 'note') {
        const div = document.createElement('div');
        div.className = 'dialog-note';
        div.innerHTML = `<strong>참고:</strong> ${item.text}`;
        dialogPanelContainer.appendChild(div);
      } else if (item.type === 'list-item') {
        const div = document.createElement('div');
        div.className = 'dialog-list-item';
        div.innerHTML = `• ${item.text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}`;
        div.style.fontSize = '13.5px';
        div.style.paddingLeft = '16px';
        dialogPanelContainer.appendChild(div);
      } else if (item.type === 'table') {
        // Render simple tables in dialogues
        const div = document.createElement('div');
        div.innerHTML = renderGrammarMarkdown(item.text);
        dialogPanelContainer.appendChild(div);
      } else if (item.type === 'dialog') {
        const row = document.createElement('div');
        // Alternating sides by speaker name
        const side = item.speaker.includes('Minho') || item.speaker.includes('Hana') ? 'right' : 'left';
        row.className = `dialog-row ${side}`;
        
        const initial = item.speaker.substring(0, 2);
        const wrappedText = wrapWordsInText(item.text, item.text);
        
        row.innerHTML = `
          <div class="dialog-avatar">${initial}</div>
          <div class="dialog-bubble-wrap">
            <span class="dialog-speaker">${item.speaker}</span>
            <div class="dialog-bubble">
              ${wrappedText}
              <i class="fa-solid fa-volume-high tts-icon"></i>
            </div>
          </div>
        `;
        
        if (showTranslation && textTranslations[textObj.title] && textTranslations[textObj.title][item.text]) {
          const bubbleWrap = row.querySelector('.dialog-bubble-wrap');
          const transDiv = document.createElement('div');
          transDiv.className = 'dialog-translation';
          transDiv.textContent = textTranslations[textObj.title][item.text];
          bubbleWrap.appendChild(transDiv);
        }
        
        // Add speech play listener
        row.querySelector('.dialog-bubble').addEventListener('click', (e) => {
          if (e.target.classList.contains('dialog-word')) {
            showDictTooltip(e.target, e.target.textContent);
            return;
          }
          // Speak full dialog text, strip punctuation if needed
          const cleanText = item.text.replace(/\([^)]+\)/g, '').trim(); // Remove brackets translation
          speakGerman(cleanText);
        });
        
        dialogPanelContainer.appendChild(row);
      } else {
        const div = document.createElement('div');
        div.className = 'dialog-text-line';
        div.innerHTML = item.text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        div.style.fontSize = '14px';
        div.style.margin = '6px 0';
        dialogPanelContainer.appendChild(div);
      }
    });
    
    // Auto-scroll to top of dialog panel
    dialogPanelContainer.scrollTop = 0;
  };
  
  selectTextChapter.addEventListener('change', () => {
    currentTextLektionIndex = parseInt(selectTextChapter.value);
    renderActiveText();
  });
  
  btnPrevText.addEventListener('click', () => {
    if (textData.length > 0) {
      currentTextLektionIndex = (currentTextLektionIndex - 1 + textData.length) % textData.length;
      renderActiveText();
    }
  });
  
  btnNextText.addEventListener('click', () => {
    if (textData.length > 0) {
      currentTextLektionIndex = (currentTextLektionIndex + 1) % textData.length;
      renderActiveText();
    }
  });
  
  // --- Quizzes Tab Renderer ---
  const populateQuizFilters = () => {
    selectQuizChapter.innerHTML = '';
    // Unique chapters in quizzes
    const uniqueCh = [...new Set(quizData.map(q => q.chapterTitle))];
    uniqueCh.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch;
      opt.textContent = ch;
      selectQuizChapter.appendChild(opt);
    });
    
    if (uniqueCh.length > 0) {
      renderQuizSidebar(uniqueCh[0]);
    }
  };
  
  const renderQuizSidebar = (chapterTitle) => {
    quizListContainer.innerHTML = '';
    const filtered = quizData.filter(q => q.chapterTitle === chapterTitle);
    
    filtered.forEach(q => {
      const btn = document.createElement('button');
      const isSolved = userProgress.solvedQuizzes[q.id] !== undefined;
      btn.className = `quiz-item-btn ${isSolved ? 'solved-correct' : ''}`;
      btn.innerHTML = `
        <span>${q.title.split('(')[0].trim()}</span>
        <i class="${isSolved ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} status-icon"></i>
      `;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quiz-item-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderActiveQuiz(q);
      });
      quizListContainer.appendChild(btn);
    });
  };
  
  const renderActiveQuiz = (quizObj) => {
    quizTitle.textContent = quizObj.title;
    quizDescription.textContent = `${quizObj.chapterTitle} • 총 ${quizObj.questions.filter(q => q.type === 'blank').length} 문제`;
    quizBodyContainer.innerHTML = '';
    
    // Show footer
    quizFooterContainer.style.display = 'flex';
    quizScorePanel.style.display = 'none';
    
    // AI Quiz Delete Button
    const btnDeleteAiQuiz = document.getElementById('btn-delete-ai-quiz');
    if (btnDeleteAiQuiz) {
      if (quizObj.id.startsWith('quiz-ai-')) {
        btnDeleteAiQuiz.style.display = 'block';
        btnDeleteAiQuiz.onclick = () => {
          if (confirm('이 AI 생성 문제를 삭제하시겠습니까?')) {
            aiQuizzes = aiQuizzes.filter(q => q.id !== quizObj.id);
            saveAiQuizzes();
            quizData = quizData.filter(q => q.id !== quizObj.id);
            // Refresh sidebar
            renderQuizSidebar(selectQuizChapter.value);
            // Show empty state
            selectQuizChapter.dispatchEvent(new Event('change'));
          }
        };
      } else {
        btnDeleteAiQuiz.style.display = 'none';
      }
    }
    
    // Check solved status
    const prevScore = userProgress.solvedQuizzes[quizObj.id];
    
    let blankIndexGlobal = 0;
    
    // Options pool (if present)
    if (quizObj.options && quizObj.options.length > 0) {
      const poolDiv = document.createElement('div');
      poolDiv.className = 'vocab-options-pool';
      poolDiv.innerHTML = '<strong>보기:</strong> ';
      quizObj.options.forEach(opt => {
        const span = document.createElement('span');
        span.className = 'vocab-pool-tag';
        span.textContent = opt;
        span.addEventListener('click', () => {
          // Find first empty input and fill it
          const inputs = quizBodyContainer.querySelectorAll('.quiz-input');
          const empty = Array.from(inputs).find(i => i.value === '');
          if (empty) {
            empty.value = opt;
            // animate focus
            empty.focus();
          }
        });
        poolDiv.appendChild(span);
      });
      quizBodyContainer.appendChild(poolDiv);
    }
    
    quizObj.questions.forEach((q, idx) => {
      if (q.type === 'info') {
        const div = document.createElement('div');
        div.className = 'quiz-question-row';
        div.innerHTML = `<span class="question-text">• ${wrapWordsInText(q.text, q.text)}</span>`;
        quizBodyContainer.appendChild(div);
      } else if (q.type === 'label') {
        const div = document.createElement('div');
        div.style.fontSize = '13.5px';
        div.style.color = 'var(--text-secondary)';
        div.style.padding = '8px 20px 4px 20px';
        div.innerHTML = wrapWordsInText(q.text, q.text);
        quizBodyContainer.appendChild(div);
      } else if (q.type === 'blank') {
        const row = document.createElement('div');
        row.className = 'quiz-question-row';
        row.id = `q-row-${idx}`;
        
        // Parse blanks into input tags
        const cleanText = q.text.replace(/\\_/g, '_');
        const textParts = cleanText.split(/____+/);
        let htmlContent = `<span class="question-text">${q.number}. `;
        
        textParts.forEach((part, pIdx) => {
          htmlContent += wrapWordsInText(part, cleanText);
          if (pIdx < textParts.length - 1) {
            htmlContent += `<input type="text" class="quiz-input" data-global-blank="${blankIndexGlobal}" placeholder="정답 입력">`;
            blankIndexGlobal++;
          }
        });
        htmlContent += `</span>`;
        
        row.innerHTML = htmlContent;
        quizBodyContainer.appendChild(row);
      }
    });
    
    // Hook submit action
    // Remove previous listeners
    const newSubmitBtn = btnQuizSubmit.cloneNode(true);
    btnQuizSubmit.parentNode.replaceChild(newSubmitBtn, btnQuizSubmit);
    
    newSubmitBtn.addEventListener('click', () => {
      gradeQuiz(quizObj);
    });
    
    // Reset listener
    const newResetBtn = btnQuizReset.cloneNode(true);
    btnQuizReset.parentNode.replaceChild(newResetBtn, btnQuizReset);
    newResetBtn.addEventListener('click', () => {
      // Clear inputs
      quizBodyContainer.querySelectorAll('.quiz-input').forEach(i => {
        i.value = '';
        i.className = 'quiz-input';
        i.disabled = false;
      });
      // Clear feedbacks
      quizBodyContainer.querySelectorAll('.quiz-answer-feedback').forEach(f => f.remove());
      quizBodyContainer.querySelectorAll('.quiz-hint-text').forEach(h => h.remove());
      quizBodyContainer.querySelectorAll('.quiz-question-row').forEach(r => {
        r.className = 'quiz-question-row';
      });
      quizScorePanel.style.display = 'none';
    });
    
    if (prevScore !== undefined) {
      // Fill previously solved or show notice
      quizScoreText.textContent = `이전에 해결한 퀴즈 (점수: ${prevScore}%)`;
      quizScorePanel.style.display = 'block';
    }
  };
  
  const gradeQuiz = (quizObj) => {
    if (!quizObj.answers) {
      alert('정답 해설 데이터가 없는 연습문제입니다. 텍스트 확인을 통해 연습해 보세요.');
      return;
    }
    
    const inputs = quizBodyContainer.querySelectorAll('.quiz-input');
    let correctCount = 0;
    
    inputs.forEach(input => {
      const idx = parseInt(input.getAttribute('data-global-blank'));
      const userAnswer = input.value.trim().toLowerCase();
      const correctAnswer = quizObj.answers[idx] ? quizObj.answers[idx].trim() : '';
      
      // Clean correctness check (removing extra spaces or capitalization)
      const isCorrect = userAnswer === correctAnswer.toLowerCase();
      
      input.disabled = true;
      
      const parentRow = input.closest('.quiz-question-row');
      
      // Feedback display
      const feedback = document.createElement('span');
      if (isCorrect) {
        correctCount++;
        input.className = 'quiz-input correct';
        feedback.className = 'quiz-answer-feedback correct';
        feedback.innerHTML = '<i class="fa-solid fa-circle-check"></i> 정답';
      } else {
        input.className = 'quiz-input incorrect';
        feedback.className = 'quiz-answer-feedback incorrect';
        feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> 오답 (정답: <strong>${correctAnswer}</strong>)`;
      }
      
      // Place feedback after input
      input.parentNode.appendChild(feedback);
      
      if (parentRow) {
        parentRow.classList.add(isCorrect ? 'correct' : 'incorrect');
      }
    });
    
    // Show Score
    const percent = Math.round((correctCount / inputs.length) * 100);
    quizScoreText.textContent = `최종 점수: ${correctCount} / ${inputs.length} (${percent}%)`;
    quizScorePanel.style.display = 'block';
    
    // Save solved status in progress
    userProgress.solvedQuizzes[quizObj.id] = percent;
    saveUserProgress();
    
    // Refresh sidebar to update icons
    renderQuizSidebar(selectQuizChapter.value);
    
    // Reactivate menu active style
    const activeBtn = Array.from(quizListContainer.querySelectorAll('.quiz-item-btn'))
                           .find(btn => btn.textContent.includes(quizObj.title.split('(')[0].trim()));
    if (activeBtn) activeBtn.classList.add('active');
  };
  
  selectQuizChapter.addEventListener('change', () => {
    renderQuizSidebar(selectQuizChapter.value);
    // Show empty state inside quiz content
    quizTitle.textContent = '연습문제를 선택해 주세요.';
    quizDescription.textContent = '';
    quizBodyContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-question"></i>
        <p>왼쪽 목록에서 풀고 싶은 연습문제를 선택해 주세요.</p>
      </div>
    `;
    quizFooterContainer.style.display = 'none';
  });
  


  // --- Floating German Keyboard Logic ---
  let lastFocusedInput = null;

  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
      lastFocusedInput = e.target;
    }
  });

  const keyboardKeys = document.querySelectorAll('.key-btn');
  keyboardKeys.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent losing focus
      if (lastFocusedInput) {
        const char = btn.textContent;
        const start = lastFocusedInput.selectionStart || 0;
        const end = lastFocusedInput.selectionEnd || 0;
        const val = lastFocusedInput.value;
        lastFocusedInput.value = val.substring(0, start) + char + val.substring(end);
        lastFocusedInput.selectionStart = lastFocusedInput.selectionEnd = start + 1;
        lastFocusedInput.focus();
      }
    });
  });

  // --- Global Search Handler ---
  globalSearchInput.addEventListener('input', () => {
    const query = globalSearchInput.value.trim().toLowerCase();
    if (!query) {
      renderVocabList();
      return;
    }
    
    // Jump to vocabulary page to show matches
    switchTab('vocabulary');
    btnVocabList.click(); // switch to list view
    
    vocabListContainer.innerHTML = '';
    const filtered = vocabData.filter(v => {
      return v.word.toLowerCase().includes(query) || 
             v.meaning.toLowerCase().includes(query) || 
             v.group.toLowerCase().includes(query) ||
             (v.note && v.note.toLowerCase().includes(query));
    });
    
    if (filtered.length === 0) {
      vocabListContainer.innerHTML = `
        <div class="empty-state" style="grid-column: span 3; padding: 40px 0;">
          <i class="fa-solid fa-folder-open"></i>
          <p>"${query}"에 대한 검색 결과가 없습니다.</p>
        </div>
      `;
      return;
    }
    
    filtered.forEach(v => {
      const isLearned = !!userProgress.learnedWords[v.word];
      const card = document.createElement('div');
      card.className = `vocab-item-card ${isLearned ? 'learned' : ''}`;
      card.innerHTML = `
        <div class="vocab-card-header">
          <span class="vocab-category">${v.chapter} - ${v.group}</span>
          <button class="vocab-learned-btn">
            <i class="${isLearned ? 'fa-solid' : 'fa-regular'} fa-circle-check"></i>
          </button>
        </div>
        <h4 class="vocab-word-de">
          ${v.word}
          <button class="vocab-sound-btn"><i class="fa-solid fa-volume-high"></i></button>
        </h4>
        <p class="vocab-word-kr">${v.meaning}</p>
        ${v.note ? `<span class="vocab-note">${v.note}</span>` : ''}
      `;
      
      card.querySelector('.vocab-learned-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        userProgress.learnedWords[v.word] = !userProgress.learnedWords[v.word];
        saveUserProgress();
        globalSearchInput.dispatchEvent(new Event('input')); // Re-run search
      });
      
      card.querySelector('.vocab-sound-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        speakGerman(v.word.split(',')[0].split('/')[0].trim());
      });
      
      vocabListContainer.appendChild(card);
    });
  });
  
  // --- AI Quiz Generation Logic ---
  const btnGenerateAiQuiz = document.getElementById('btn-generate-ai-quiz');
  const modalAiLoading = document.getElementById('modal-ai-loading');
  const aiLoadingStatus = document.getElementById('ai-loading-status');
  
  if (btnGenerateAiQuiz) {
    btnGenerateAiQuiz.addEventListener('click', async () => {
      const chapterFilter = selectQuizChapter.value; 
      if (!chapterFilter) return;
      
      const chMatch = chapterFilter.match(/^(\d+)장/);
      const chNum = chMatch ? chMatch[1] : null;
      if (!chNum) {
        alert("장 번호를 찾을 수 없습니다.");
        return;
      }
      
      // Filter words for this chapter and earlier chapters
      const currentChapterWords = vocabData
        .filter(v => {
          const vChMatch = v.chapter.match(/^(\d+)장/);
          const vChNum = vChMatch ? parseInt(vChMatch[1]) : 999;
          return vChNum <= parseInt(chNum);
        })
        .map(v => `${v.word} (${v.meaning})`)
        .join(', ');
        
      const currentGrammar = grammarData
        .filter(g => {
          const gChMatch = g.title.match(/^(\d+)장/);
          const gChNum = gChMatch ? parseInt(gChMatch[1]) : 999;
          return gChNum <= parseInt(chNum);
        })
        .map(g => g.title)
        .join(', ');

      const quizCountInput = document.getElementById('ai-quiz-count');
      const numQuestions = quizCountInput ? (parseInt(quizCountInput.value, 10) || 5) : 5;

      modalAiLoading.style.display = 'flex';
      aiLoadingStatus.textContent = 'API 요청 중입니다... (10~30초 소요될 수 있습니다.)';

      const prompt = `당신은 A1 수준의 친절한 독일어 교사입니다.
다음은 학습자가 현재까지 배운 어휘와 문법 주제 목록입니다.

[배운 문법]
${currentGrammar}

[배운 어휘]
${currentChapterWords}

[지시사항]
1. 학습자가 배운 어휘와 기초적인 A1 수준 문법만을 활용하여, 빈칸 채우기(Lückentext) 독일어 연습문제 ${numQuestions}개를 만들어 주세요.
2. 각 문제는 1개의 빈칸을 가지며, 빈칸은 반드시 언더스코어 4개(____)로 표시하세요.
3. 한국어 뜻이나 설명은 포함하지 말고, 순수 독일어 문장만 작성하세요.
4. 출력은 반드시 아래와 같은 형태의 JSON 배열이어야 합니다. 마크다운 코드블럭(\`\`\`json ... \`\`\`) 안에 담아주세요.

[
  {
    "text": "Ich ____ aus Korea.",
    "answer": "komme"
  }
]`;

      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getApiKey()}`
          },
          body: JSON.stringify({
            model: 'deepseek-reasoner',
            messages: [
              { role: 'system', content: 'You are a helpful German language teacher that outputs exactly valid JSON arrays.' },
              { role: 'user', content: prompt }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`API 요청 실패: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        
        // Strip markdown code blocks if any
        if (content.startsWith('```json')) {
          content = content.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (content.startsWith('```')) {
          content = content.replace(/^```/, '').replace(/```$/, '').trim();
        }
        
        let parsedJson;
        try {
          parsedJson = JSON.parse(content);
        } catch (err) {
          throw new Error('JSON 파싱에 실패했습니다. AI가 형식을 맞추지 않았을 수 있습니다.');
        }
        
        if (!Array.isArray(parsedJson)) {
          throw new Error('JSON 배열 포맷이 아닙니다.');
        }

        // Add to quizData
        const newQuizId = `quiz-ai-${Date.now()}`;
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const aiQuiz = {
          id: newQuizId,
          chapterNum: chNum,
          chapterTitle: chapterFilter,
          ubungNum: 'AI',
          title: `AI 연습문제 (${nowStr})`,
          questions: parsedJson.map((q, idx) => ({
             type: 'blank',
             number: (idx + 1).toString(),
             text: q.text
          })),
          options: [],
          answers: parsedJson.map(q => q.answer) 
        };

        quizData.push(aiQuiz);
        aiQuizzes.push(aiQuiz);
        saveAiQuizzes();
        
        // Re-render
        renderQuizSidebar(chapterFilter);
        
        // Select the newly added quiz
        const navBtns = Array.from(document.querySelectorAll('.quiz-item-btn'));
        const newBtn = navBtns.find(b => b.textContent.includes(`AI 연습문제 (${nowStr})`));
        if (newBtn) newBtn.click();
        
      } catch (e) {
        console.error(e);
        if (e.message === 'MISSING_API_KEY') {
          alert('AI 기능을 사용하려면 우측 상단 ⚙️ 설정에서 API 키를 먼저 입력해주세요.');
        } else {
          alert('문제를 생성하는 도중 오류가 발생했습니다: ' + e.message);
        }
      } finally {
        modalAiLoading.style.display = 'none';
      }
    });
  }
  
  // --- Loading Application Data ---
  const loadData = async () => {
    try {
      loadStatusText.textContent = '데이터 읽는 중...';
      
      const [vocabRes, grammarRes, textRes, quizRes, textTransRes, ctxRes] = await Promise.all([
        fetch('vocab_05.20.md').then(r => { if (!r.ok) throw new Error(); return r.text(); }),
        fetch('grammar_05.20.md').then(r => { if (!r.ok) throw new Error(); return r.text(); }),
        fetch('text_05.20.md').then(r => { if (!r.ok) throw new Error(); return r.text(); }),
        fetch('quiz_05.20.md').then(r => { if (!r.ok) throw new Error(); return r.text(); }),
        fetch('text_translation_05.20.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('context_dict_05.20.json').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      
      // Parse markdown data
      vocabData = parseVocabulary(vocabRes);
      grammarData = parseGrammar(grammarRes);
      textData = parseTexts(textRes);
      quizData = parseQuizzes(quizRes);
      
      // Merge AI quizzes
      loadAiQuizzes();
      quizData = [...quizData, ...aiQuizzes];
      
      // Merge pre-generated translations
      if (textTransRes) {
        textTranslations = { ...textTransRes, ...textTranslations };
      }
      
      if (ctxRes) {
        contextDict = ctxRes;
      }
      
      // --- API Key Management ---
      const getApiKey = () => {
        const key = localStorage.getItem('deepseek_api_key');
        if (!key) throw new Error('MISSING_API_KEY');
        return key;
      };

      const apiModal = document.getElementById('api-settings-modal');
      const apiKeyInput = document.getElementById('deepseek-api-key');

      document.getElementById('btn-api-settings').addEventListener('click', () => {
        apiKeyInput.value = localStorage.getItem('deepseek_api_key') || '';
        apiModal.style.display = 'flex';
      });

      document.getElementById('btn-close-api-modal').addEventListener('click', () => {
        apiModal.style.display = 'none';
      });

      document.getElementById('btn-save-api-key').addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
          localStorage.setItem('deepseek_api_key', key);
          alert('API 키가 안전하게 저장되었습니다.');
          apiModal.style.display = 'none';
        } else {
          localStorage.removeItem('deepseek_api_key');
          alert('API 키가 삭제되었습니다.');
          apiModal.style.display = 'none';
        }
      });
      
      // UI initialization
      populateVocabFilters();
      populateTextFilters();
      populateQuizFilters();
      
      // Initial render calls
      renderDashboard();
      renderVocabList();
      updateFilteredVocabCards();
      renderVocabFlashcard();
      renderGrammar();
      renderActiveText();
      loadStatusText.textContent = '정상 연결됨';
      loadStatusDot.className = 'dot connected';
    } catch (e) {
      console.error('Failed to load markdown files', e);
      loadStatusText.textContent = '로딩 실패 (CORS 또는 파일 누락)';
      loadStatusDot.className = 'dot';
      
      // Show CORS/Local file help on dashboard
      const dashboardBody = document.getElementById('page-dashboard');
      if (dashboardBody) {
        const isLocalFile = window.location.protocol === 'file:';
        
        let errorMsgHtml = '';
        if (isLocalFile) {
          errorMsgHtml = `
            <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 20px auto; line-height: 1.6;">
              브라우저의 보안 정책(CORS)으로 인해 로컬 파일(index.html)을 직접 더블 클릭하여 실행하면 데이터를 읽어올 수 없습니다.<br>
              이를 해결하기 위해 <strong>로컬 웹 서버</strong>를 실행해야 합니다.
            </p>
            <div style="background-color: var(--bg-primary); padding: 16px 24px; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-align: left; max-width: 500px; margin: 0 auto 20px auto; font-family: monospace; font-size: 13px;">
              # 터미널에서 이 폴더로 이동한 후 아래 명령을 실행하세요:<br>
              <span style="color: var(--color-secondary);">python3 -m http.server</span><br><br>
              # 그 후 웹 브라우저에서 아래 주소로 접속하세요:<br>
              <span style="color: var(--color-secondary);">http://localhost:8000</span>
            </div>
          `;
        } else {
          errorMsgHtml = `
            <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 20px auto; line-height: 1.6;">
              서버에서 교재 데이터를 찾을 수 없습니다. (404 Not Found)<br>
              GitHub Pages 등에 파일을 업로드하실 때, <strong>압축을 푼 폴더 전체를 올리지 마시고 반드시 폴더 내부의 파일들만 선택해서</strong> 최상단에 올려주세요.
            </p>
          `;
        }

        dashboardBody.innerHTML = `
          <div class="panel" style="border-color: var(--color-danger); background-color: rgba(239, 68, 68, 0.05); padding: 32px; text-align: center;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 48px; color: var(--color-danger); margin-bottom: 16px;"></i>
            <h2 style="color: var(--text-primary); margin-bottom: 12px;">마크다운 교재 데이터를 불러오지 못했습니다</h2>
            ${errorMsgHtml}
            <p style="color: var(--text-tertiary); font-size: 12px;">
              참고: 파일 이름은 반드시 영문이어야 합니다 (vocab_05.20.md, grammar_05.20.md, text_05.20.md, quiz_05.20.md).
            </p>
          </div>
        `;
      }
    }
  };
  
  // Initialize everything
  loadUserProgress();
  loadAiDictCache();
  loadTextTranslations();
  initTTS();
  loadData();
});
