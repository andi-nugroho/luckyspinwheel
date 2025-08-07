const { minify } = require('html-minifier');

const htmlMinifyMiddleware = (req, res, next) => {
    const originalSend = res.send;

    res.send = function (body) {
        if (typeof body === 'string' && res.get('Content-Type') && res.get('Content-Type').includes('text/html')) {
            try {
                const minified = minify(body, {
                    removeComments: true,
                    collapseWhitespace: true,
                    minifyJS: true,
                    minifyCSS: true
                });
                return originalSend.call(this, minified);
            } catch (err) {
                console.error('HTML minify/obfuscate error:', err);
                return originalSend.call(this, body);
            }
        }
        return originalSend.call(this, body);
    };

    next();
};

module.exports = htmlMinifyMiddleware;