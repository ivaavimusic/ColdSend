# Contributing to ColdSend

Thank you for your interest in contributing to ColdSend! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/coldsend.git
   cd coldsend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   - Local: http://localhost:4000
   - Network: http://YOUR_IP:4000

### Project Structure

```
coldsend/
├── src/
│   ├── server.js           # Express server & API endpoints
│   └── bluetooth/          # Bluetooth adapter implementations
│       ├── index.js        # Adapter factory
│       ├── noble.js        # BLE implementation
│       └── mock.js         # Development mock
├── public/                 # Frontend assets
│   ├── index.html         # Main UI
│   ├── styles.css         # Neumorphism styling
│   └── app.js             # Frontend JavaScript
└── uploads/               # Temporary file storage
```

## 🎯 How to Contribute

### Types of Contributions

- **🐛 Bug Reports**: Found a bug? Please report it!
- **✨ Feature Requests**: Have an idea? We'd love to hear it!
- **🔧 Code Contributions**: Fix bugs or implement features
- **📚 Documentation**: Improve docs, examples, or guides
- **🎨 UI/UX**: Enhance the user interface or experience
- **🧪 Testing**: Add tests or improve test coverage

### Before You Start

1. **Check existing issues** to avoid duplicates
2. **Create an issue** for major changes to discuss first
3. **Follow the code style** established in the project
4. **Test your changes** thoroughly

## 📝 Submitting Changes

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Add comments for complex logic
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm test  # Run tests (when available)
   npm run dev  # Test manually
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes

### Commit Message Format

We use conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add device auto-discovery
fix: resolve connection timeout issue
docs: update installation instructions
style: improve button hover effects
```

## 🎨 Code Style Guidelines

### JavaScript
- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use meaningful variable names
- Add JSDoc comments for functions
- Follow existing indentation (2 spaces)

### CSS
- Use CSS custom properties (variables)
- Follow BEM naming convention where applicable
- Group related properties together
- Use consistent spacing and indentation

### HTML
- Use semantic HTML elements
- Include proper accessibility attributes
- Keep markup clean and well-structured

## 🧪 Testing

### Manual Testing
- Test on different browsers (Chrome, Firefox, Safari)
- Test responsive design on mobile devices
- Test both light and dark themes
- Test Bluetooth functionality if possible

### Automated Testing (Future)
We plan to add automated testing. Contributions welcome!

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs actual behavior
4. **Environment details**:
   - OS and version
   - Browser and version
   - Node.js version
   - Bluetooth adapter type
5. **Screenshots** if applicable
6. **Console errors** if any

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Environment:**
- OS: [e.g. macOS 12.0]
- Browser: [e.g. Chrome 95.0]
- Node.js: [e.g. 18.0.0]
- Bluetooth: [e.g. BLE, Mock]

**Additional context**
Any other context about the problem.
```

## 💡 Feature Requests

When requesting features:

1. **Describe the problem** you're trying to solve
2. **Explain your proposed solution**
3. **Consider alternatives** you've thought of
4. **Provide use cases** and examples
5. **Consider implementation complexity**

## 🔒 Security

If you discover a security vulnerability:

1. **Do NOT** create a public issue
2. **Email** security@coldsend.dev
3. **Include** detailed information about the vulnerability
4. **Wait** for our response before public disclosure

## 📋 Development Guidelines

### Adding New Features

1. **Create an issue** first to discuss the feature
2. **Design the API** if it involves backend changes
3. **Consider backwards compatibility**
4. **Update documentation** as needed
5. **Add appropriate error handling**

### Bluetooth Adapters

When adding new Bluetooth adapters:

1. **Implement the adapter interface**:
   ```javascript
   class YourAdapter {
     constructor(opts) { /* ... */ }
     async scanDevices() { /* ... */ }
     async connectDevice(device) { /* ... */ }
     async disconnectDevice(device) { /* ... */ }
     async sendText(text, meta) { /* ... */ }
     async sendFile(filePath, meta) { /* ... */ }
   }
   ```

2. **Add to the factory** in `src/bluetooth/index.js`
3. **Update documentation** with configuration options
4. **Test thoroughly** with real hardware if possible

### UI Components

When adding UI components:

1. **Follow Neumorphism design** principles
2. **Support both themes** (light/dark)
3. **Make it responsive** for mobile devices
4. **Add proper accessibility** attributes
5. **Use CSS custom properties** for theming

## 🌟 Recognition

Contributors will be:

- **Listed** in the README acknowledgments
- **Credited** in release notes for significant contributions
- **Invited** to join the core team for sustained contributions

## 📞 Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Discord** (coming soon): For real-time chat

## 📄 License

By contributing to ColdSend, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ColdSend! 🚀
