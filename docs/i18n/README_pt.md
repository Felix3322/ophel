# Ophel 🚀

<p align="center">
  <img src="../../assets/icon.png" width="120" height="120" alt="Ophel Logo">
</p>

<p align="center">
  <strong>✨ O benefício da IA, ao seu alcance ✨</strong><br/>
  <em>AI's Benefit, Within Reach.</em>
</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey.svg" alt="License"></a>
  <img src="https://img.shields.io/github/package-json/v/urzeye/ophel?color=blue" alt="Version">
  <a href="https://github.com/urzeye/ophel/stargazers"><img src="https://img.shields.io/github/stars/urzeye/ophel?style=social" alt="Stars"></a>
  <a href="https://opencollective.com/urzeye-oss"><img src="https://img.shields.io/badge/Sponsor-Open%20Collective-blue?logo=opencollective" alt="Sponsor"></a>
</p>

<p align="center">
  <a href="#-principais-recursos">Recursos</a> •
  <a href="#-demo">Demo</a> •
  <a href="#-início-rápido">Início Rápido</a> •
  <a href="#-support">Apoiar o Projeto</a>
</p>

<p align="center">
  🌐 <a href="../../README_EN.md">English</a> | <a href="../../README.md">简体中文</a> | <a href="./README_zh-TW.md">繁體中文</a> | <a href="./README_ja.md">日本語</a> | <a href="./README_ko.md">한국어</a> | <a href="./README_de.md">Deutsch</a> | <a href="./README_fr.md">Français</a> | <a href="./README_es.md">Español</a> | <strong>Português</strong> | <a href="./README_ru.md">Русский</a>
</p>

---

👋 **Ophel** é uma extensão de navegador que oferece uma experiência aprimorada e unificada para as principais plataformas de IA, como **Gemini**, **ChatGPT**, **Claude**, **Grok** e **AI Studio**.

## 📹 Demo

|                                                          Outline                                                           |                                                       Conversations                                                        |                                                          Features                                                          |
| :------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------: |
| <video src="https://github.com/user-attachments/assets/a40eb655-295e-4f9c-b432-9313c9242c9d" width="280" controls></video> | <video src="https://github.com/user-attachments/assets/a249baeb-2e82-4677-847c-2ff584c3f56b" width="280" controls></video> | <video src="https://github.com/user-attachments/assets/6dfca20d-2f88-4844-b3bb-c48321100ff4" width="280" controls></video> |

## ✨ Principais Recursos

- 🧠 **Smart Outline** — Análise automática de perguntas e respostas para gerar um índice navegável
- 💬 **Gerenciamento de Conversas** — Organização por pastas, tags, busca e operações em lote
- ⌨️ **Biblioteca de Prompts** — Suporte a variáveis, pré-visualização Markdown, categorias, preenchimento com um clique
- 🎨 **Personalização de Temas** — Mais de 20 temas claros/escuros, CSS personalizado
- 🔧 **Otimização de Interface** — Modo widescreen, ajuste de largura, controle da barra lateral
- 📖 **Experiência de Leitura** — Bloqueio de rolagem, restauração de histórico, renderização Markdown otimizada
- ⚡ **Produtividade** — Atalhos de teclado, bloqueio de modelo, renomeação automática de abas, notificações
- 🎭 **Melhorias para Claude** — Gerenciamento de Session Key, troca de contas
- 🔒 **Privacidade em Primeiro Lugar** — Armazenamento local, sincronização WebDAV, sem coleta de dados

## 🚀 Início Rápido

> [!note]
> **Recomenda-se usar a versão de extensão de navegador.** Ela oferece mais recursos, melhor experiência e maior compatibilidade. A versão Userscript (Tampermonkey) é limitada (sem acesso a cookies, sem popups independentes, etc.).

### Lojas de Aplicativos

[Chrome](https://chromewebstore.google.com/detail/ophel-ai-%E5%AF%B9%E8%AF%9D%E5%A2%9E%E5%BC%BA%E5%B7%A5%E5%85%B7/lpcohdfbomkgepfladogodgeoppclakd) | [Firefox](https://addons.mozilla.org/zh-CN/firefox/addon/ophel-ai-chat-enhancer) | [Greasy Fork](https://greasyfork.org/zh-CN/scripts/563646-ophel)

### Instalação Manual

#### Extensão de Navegador

1. Baixe e extraia o pacote de instalação em [Releases](https://github.com/urzeye/ophel/releases).
2. Abra a página de gerenciamento de extensões do seu navegador e ative o **Modo Desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta extraída.

#### Userscript

1. Instale o plugin [Tampermonkey](https://www.tampermonkey.net/).
2. Baixe o arquivo `.user.js` em [Releases](https://github.com/urzeye/ophel/releases).
3. Arraste para o navegador ou clique no link para instalar.

### Build Local

<details>
<summary>Click to expand build steps</summary>

**Requirements**: Node.js >= 20.x, pnpm >= 10.x

```bash
git clone https://github.com/urzeye/ophel.git
cd ophel
pnpm install
pnpm dev              # Development mode
pnpm build            # Chrome/Edge production build
pnpm build:firefox    # Firefox production build
pnpm build:userscript # Userscript production build
```

**Tech Stack**: [Plasmo](https://docs.plasmo.com/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Zustand](https://github.com/pmndrs/zustand)

</details>

### 🐛 Feedback

Se tiver problemas ou sugestões, por favor, reporte em [GitHub Issues](https://github.com/urzeye/ophel/issues).

## ⭐ Star History

<a href="https://star-history.com/#urzeye/ophel&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=urzeye/ophel&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=urzeye/ophel&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=urzeye/ophel&type=Date" />
 </picture>
</a>

## 💖 Apoiar o Projeto

<p align="center">
  <em>"If you want to go fast, go alone. If you want to go far, go together."</em>
</p>

<p align="center">
  If Ophel helps you, consider supporting:<br/><br/>
  <a href="https://opencollective.com/urzeye-oss">
    <img src="https://opencollective.com/urzeye-oss/donate/button@2x.png?color=blue" width="200" alt="Donate to Open Collective">
  </a>
</p>

<p align="center">
  Made with ❤️ by <a href="https://github.com/urzeye">urzeye</a>
</p>

## 📜 Licença

This project is licensed under **CC BY-NC-SA 4.0**. See [LICENSE](../../LICENSE) for details.

> ⚠️ **Commercial packaging, resale, or unauthorized integration is prohibited.** For commercial licensing: **<igodu.love@gmail.com>**
