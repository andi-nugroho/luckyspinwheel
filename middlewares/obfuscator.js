const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const obfuscateMiddleware = (req, res, next) => {
    const jsFiles = ['/js/admin.js', '/js/winwheel.js', '/js/wheel.js'];
    
    if (jsFiles.includes(req.path)) {
        const filePath = path.join(__dirname, '..', 'public', req.path);
        
        try {
            const code = fs.readFileSync(filePath, 'utf8');
            const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.75,
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 0.5,
                debugProtection: true,
                disableConsoleOutput: false,
                identifierNamesGenerator: 'hexadecimal',
                log: false,
                renameGlobals: false,
                rotateStringArray: true,
                selfDefending: true,
                shuffleStringArray: true,
                splitStrings: true,
                stringArray: true,
                stringArrayEncoding: ['base64', 'rc4'],
                stringArrayThreshold: 0.75,
                transformObjectKeys: true,
                unicodeEscapeSequence: false
            });

            res.type('application/javascript');
            res.send(obfuscationResult.getObfuscatedCode());
        } catch (error) {
            console.error('Obfuscation error:', error);
            next();
        }
    } else {
        next();
    }
};

module.exports = obfuscateMiddleware;
