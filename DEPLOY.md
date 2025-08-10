# 🚀 Deployment Guide for Mina's USS Adventure

## Quick GitHub Setup

### 1. Configure Git (First time only)
```bash
git config --global user.name "YourGitHubUsername"
git config --global user.email "your.email@example.com"
```

### 2. Create Initial Commit
```bash
git commit -m "Initial commit: Mina's USS Adventure

🎮 Complete 3D web game featuring:
- Universal Studios Singapore recreation  
- Dynamic sunset to night lighting system
- Mobile touch controls with virtual joystick
- Companion AI (Sacha follows Mina)
- Giant scary mummy monsters
- Enhanced character faces with detailed features
- Optimized performance for mobile devices
- Treasure hunting gameplay
- Authentic USS attractions and zones

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 3. Create GitHub Repository
1. Go to [GitHub.com](https://github.com)
2. Click "New Repository"
3. Name it: `minas-uss-adventure`
4. Make it **Public** so others can play
5. Don't initialize with README (we already have one)
6. Click "Create repository"

### 4. Connect and Push
```bash
git remote add origin https://github.com/YourUsername/minas-uss-adventure.git
git branch -M main
git push -u origin main
```

## 🌐 Enable GitHub Pages (Free Hosting!)

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll to **Pages** section
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch and **/ (root)** folder
6. Click **Save**

Your game will be live at:
`https://yourusername.github.io/minas-uss-adventure/`

## 📱 Testing Checklist

### Desktop Testing
- [ ] WASD movement works
- [ ] Mouse camera controls work
- [ ] Characters appear and move
- [ ] Dynamic lighting transitions
- [ ] Monsters chase players
- [ ] Treasures can be collected

### Mobile Testing
- [ ] Virtual joystick appears and works
- [ ] Run button functions
- [ ] Camera button toggles camera mode
- [ ] Touch camera controls work
- [ ] Performance is smooth (30+ fps)
- [ ] UI scales properly

## 🎮 File Structure
```
minas-uss-adventure/
├── index.html          # Main game page
├── game.js             # Complete game engine
├── README.md           # Project documentation
├── .gitignore          # Git ignore rules
└── DEPLOY.md          # This deployment guide
```

## 🚀 Go Live!

Once pushed to GitHub with Pages enabled, share your game:
- **Direct Link**: `https://yourusername.github.io/minas-uss-adventure/`
- **Mobile Friendly**: Works on all devices
- **No Installation**: Runs in any modern web browser
- **Free Hosting**: Powered by GitHub Pages

Enjoy your Universal Studios Singapore adventure! 🎢✨