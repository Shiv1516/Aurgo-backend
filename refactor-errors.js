const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'routes');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Regex to add 'next' arguments to the route handler functions, supporting 'async (req, res)' 
  // and changing to 'async (req, res, next)'
  let newContent = content.replace(/(?<!, )async \(req, res\) =>/g, "async (req, res, next) =>");

  // Replaces the specific verbose status 500 return with just passing the error forward
  newContent = newContent.replace(/res\.status\(500\)\.json\(\{\s*(?:success:\s*false,\s*)?error:\s*error\.message\s*\}\);?/g, "next(error);");
  newContent = newContent.replace(/res\.status\(500\)\.json\(\{\s*(?:success:\s*false,\s*)?message:\s*error\.message\s*\}\);?/g, "next(error);");
  // Also replace 'error: error' 
  newContent = newContent.replace(/res\.status\(500\)\.json\(\{\s*(?:success:\s*false,\s*)?message:\s*error\s*\}\);?/g, "next(error);");


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
console.log("Refactoring complete.");
