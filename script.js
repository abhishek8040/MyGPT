const API_KEY = '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';
const API_ENDPOINT = 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct';

document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupEventListeners();
});

function setupTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    });
}

function setupEventListeners() {
    const sendBtn = document.getElementById('send-btn');
    const promptInput = document.getElementById('prompt-input');

    sendBtn.addEventListener('click', handleSubmit);
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    });
}

async function handleSubmit() {
    const promptInput = document.getElementById('prompt-input');
    const languageSelect = document.getElementById('language-select');
    const prompt = promptInput.value.trim();
    const language = languageSelect.value;

    if (!prompt) return;

    promptInput.value = '';
    await generateCode(prompt, language);
}

async function generateCode(prompt, language) {
    addMessage(prompt, true); // Add user message first
    const messageContainer = createMessageContainer(false); // Create AI message container
    
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 512,
                    temperature: 0.7,
                    top_p: 0.95
                }
            })
        });

        const result = await response.json();
        const text = result[0].generated_text;
        
        const { code, explanation } = extractCodeAndText(text);
        const contentDiv = messageContainer.querySelector('.message-content');
        
        if (explanation) {
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'explanation-text';
            contentDiv.appendChild(explanationDiv);
            await streamText(formatText(explanation), explanationDiv);
        }
        
        if (code) {
            const codeBlock = createCodeBlock(code, language);
            contentDiv.appendChild(codeBlock);
        }
        
    } catch (error) {
        console.error('Error:', error);
        messageContainer.querySelector('.message-content').textContent = 'Failed to generate response. Please try again.';
    }
}

function createMessageContainer(isUser) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${isUser ? '👤' : '🤖'}
        </div>
        <div class="message-content"></div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
    return messageDiv;
}

function createCodeBlock(code, language) {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';
    
    const pre = document.createElement('pre');
    const codeElement = document.createElement('code');
    codeElement.className = `language-${language}`;
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-code-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
    copyBtn.onclick = () => copyCode(code, copyBtn);
    
    pre.appendChild(codeElement);
    wrapper.appendChild(copyBtn);
    wrapper.appendChild(pre);
    
    streamCode(code, codeElement).then(() => {
        Prism.highlightElement(codeElement);
    });
    
    return wrapper;
}


// Add new formatText function
function formatText(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n\n');
}

// Update streamText function
async function streamText(text, element) {
    const sentences = text.split(/([.!?]\s+)/);
    element.textContent = '';
    
    for (const sentence of sentences) {
        await new Promise(resolve => setTimeout(resolve, 30));
        const span = document.createElement('span');
        span.textContent = sentence;
        element.appendChild(span);
    }
}

async function streamCode(code, element) {
    const lines = code.split('\n');
    element.textContent = '';
    
    for (const line of lines) {
        await new Promise(resolve => setTimeout(resolve, 30));
        element.textContent += (element.textContent ? '\n' : '') + line;
    }
}

function addMessage(content, isUser = false) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    if (typeof content === 'string') {
        messageContent.textContent = content;
    } else if (content instanceof HTMLElement) {
        messageContent.appendChild(content);
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${isUser ? '👤' : '🤖'}
        </div>
    `;
    messageDiv.appendChild(messageContent);
    
    messagesContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
}

function extractCodeAndText(text) {
    let code = '', explanation = '';
    
    const codeMatch = text.match(/```[\w-]*\n?([\s\S]*?)```/);
    if (codeMatch) {
        code = codeMatch[1].trim();
        explanation = text.replace(codeMatch[0], '').trim();
    } else if (isCodeBlock(text)) {
        code = text.trim();
    } else {
        explanation = text.trim();
    }
    
    return { code, explanation };
}

function isCodeBlock(text) {
    const codeIndicators = [
        'function', 'class', 'def ', 'var ', 'const ', 'let ',
        'import ', 'public class', '#include'
    ];
    return codeIndicators.some(indicator => text.includes(indicator));
}

function copyCode(code, button) {
    navigator.clipboard.writeText(code);
    button.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-copy"></i>';
    }, 2000);
}