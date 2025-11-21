import * as vscode from 'vscode';
import axios from 'axios';

const API_KEY = 'your-api-key';  // 替换成你的 OpenAI API 密钥
const API_URL = 'https://api.openai.com/v1/completions';

// 调用 ChatGPT API
async function getChatGPTCompletion(prompt: string): Promise<string> {
    try {
        const response = await axios.post(
            API_URL,
            {
                model: 'gpt-4',  // 使用 GPT-4 模型（可以根据需求选择其他模型）
                prompt: prompt,
                max_tokens: 150,  // 根据需要调整
                temperature: 0.7,  // 控制创意程度
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error("Error calling OpenAI API:", error);
        return "Error: Unable to get response from ChatGPT.";
    }
}

// 扩展激活函数
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "sscode" is now active!');

    // 注册命令
    const disposable = vscode.commands.registerCommand('sscode.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from sscode!');
    });

    // 注册 ChatGPT 代码建议命令
    const codeSuggestionCommand = vscode.commands.registerCommand('sscode.getCodeSuggestion', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const position = editor.selection.active;
            const line = document.lineAt(position.line).text;  // 获取当前行的代码

            const suggestion = await getChatGPTCompletion(line);
            vscode.window.showInformationMessage('ChatGPT Suggestion: ' + suggestion);
        }
    });

    // 将命令添加到订阅中
    context.subscriptions.push(disposable);
    context.subscriptions.push(codeSuggestionCommand);
}

// 扩展卸载函数
export function deactivate() {}
