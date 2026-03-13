const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'routes');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Replace `async (req, res) =>` with `async (req, res, next) =>`
  let newContent = content.replace(/async\s*\(\s*req\s*,\s*res\s*\)\s*=>/g, "async (req, res, next) =>");

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      traverseDirectory(filePath);
    } else if (filePath.endsWith('.js')) {
      processFile(filePath);
    }
  });
}

traverseDirectory(directoryPath);
console.log("Fix complete.");
