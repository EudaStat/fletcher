
import * as vscode from 'vscode';

async function findFilesForPatterns(patterns: string[]): Promise<vscode.Uri[]> {
  let allFiles: vscode.Uri[] = [];

  for (const pattern of patterns) {
      const files = await vscode.workspace.findFiles(pattern);
      allFiles.push(...files);
  }

  return allFiles;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Creating a separate output window to allow users to understand the 
  // what's going behing the scenes
  let fletchOut = vscode.window.createOutputChannel("fletcher");

  // TODO: deprecate this in favor of the language definitionProvider
  let hwDisposable = vscode.commands.registerCommand('fletcher.findTargetDefinition', async () =>  {
    
    const editor = vscode.window.activeTextEditor;  // Get the current active text editor.

    if (!editor) {
        vscode.window.showInformationMessage('No editor is active, cannot find a word to highlight.');
        return;
    }

    const selection = editor.selection; // Get the selection in the editor.
    const highlightedWord = editor.document.getText(selection); // Extract the word from the selection.

    vscode.window.showInformationMessage('Searching for: '+highlightedWord);

    fletchOut.appendLine("Searching for "+highlightedWord);


    let config = vscode.workspace.getConfiguration('fletcher');
    let searchDirectories: string[] = config.get('targetDefinitionGlobPatterns', []);

    const allRFiles = await findFilesForPatterns(searchDirectories);
    
    for (const file of allRFiles) {
      const fileContent = await vscode.workspace.openTextDocument(file);
      const regex = new RegExp(`\\bname\\s*=\\s*"?'?${highlightedWord}"?'?`, 'g');
      const match = regex.exec(fileContent.getText());

      if (match) {
        const position = fileContent.positionAt(match.index);
        const location = new vscode.Location(file, position);
        fletchOut.appendLine("found match in: " + file);
        // return location;
        vscode.window.showTextDocument(location.uri, {
          selection: location.range
      });
      } else {
        fletchOut.appendLine("no match in "+file);
      }
    }

    return [];
  });

  let definitionDisposable = vscode.languages.registerDefinitionProvider('R', {
    async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition | vscode.DefinitionLink[]> {
      const wordRange = document.getWordRangeAtPosition(position);
      const functionName = document.getText(wordRange);

      let fletchOut = vscode.window.createOutputChannel("fletcher");
      fletchOut.appendLine("Searching for "+functionName);

      const allRFiles = await vscode.workspace.findFiles('**/*.R', '**/*.r');
      
      for (const file of allRFiles) {
        const fileContent = await vscode.workspace.openTextDocument(file);
        const regex = new RegExp(`\\bname\\s*=\\s*"?'?${functionName}"?'?`, 'g');
        const match = regex.exec(fileContent.getText());

        if (match) {
          const position = fileContent.positionAt(match.index);
          return new vscode.Location(file, position);
        }
      }

      return [];
    }
  });

  context.subscriptions.push(definitionDisposable, hwDisposable);

}

// This method is called when your extension is deactivated
export function deactivate() {}
