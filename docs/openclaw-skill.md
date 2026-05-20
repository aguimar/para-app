# Integração com OpenClaw Agent

Este guia ensina como integrar seu agente **OpenClaw** com o **parabrain** para salvar textos, links e arquivos (imagens, PDFs, áudios, etc.) na sua Inbox do PARA.

---

## 1. Configurando o parabrain

Adicione a chave da API do agente no arquivo `.env.local` (ou nas variáveis de ambiente do seu container):

```env
# Chave de segurança para permitir que o OpenClaw salve notas no parabrain
AGENT_API_KEY="uma-chave-secreta-e-segura-aqui"
```

Se você estiver rodando em ambiente Docker, certifique-se de reiniciar o container para que as variáveis de ambiente sejam carregadas.

---

## 2. Criando o Skill no OpenClaw

Os skills do OpenClaw são definidos como pastas dentro de `~/.openclaw/skills/` (ou na pasta de skills do seu projeto OpenClaw).

Crie uma pasta chamada `save-to-parabrain`:

```bash
mkdir -p ~/.openclaw/skills/save-to-parabrain
```

Dentro desta pasta, crie dois arquivos:
1. `SKILL.md` (o arquivo de configuração e regras de ativação para a LLM)
2. `save.py` (o script auxiliar que faz a requisição de upload)

### Arquivo 1: `SKILL.md`
Copie o conteúdo abaixo para `~/.openclaw/skills/save-to-parabrain/SKILL.md`:

```markdown
---
name: save-to-parabrain
description: Salva textos, links ou arquivos no parabrain (Second Brain PARA).
metadata:
  openclaw:
    requires:
      bins: ["python3"]
---

# Save to parabrain
Use este skill sempre que o usuário pedir para salvar algo, guardar um link, guardar um texto ou fazer upload de um arquivo para o "parabrain", "segundo cérebro" ou "inbox".

## Workflow
1. Obtenha os parâmetros necessários do pedido do usuário:
   - Se for um arquivo: encontre o caminho local (path) do arquivo.
   - Se for um link/URL: extraia a URL.
   - Se for texto: extraia a nota e elabore um título conciso.
2. Execute o script `save.py` passando os parâmetros corretos:
   - Para texto: `python3 save.py --title "Título" --body "Conteúdo da nota"`
   - Para link: `python3 save.py --title "Título" --url "https://exemplo.com" --body "Descrição opcional"`
   - Para arquivo: `python3 save.py --file "/caminho/do/arquivo.ext" --title "Título opcional"`
3. Retorne a mensagem de sucesso ou erro fornecida pelo script para o usuário.
```

### Arquivo 2: `save.py`
Copie o conteúdo abaixo para `~/.openclaw/skills/save-to-parabrain/save.py`:

```python
#!/usr/bin/env python3
import argparse
import os
import sys
import mimetypes
import requests

# --- CONFIGURAÇÃO ---
# Se o OpenClaw e o parabrain estão na mesma máquina/rede:
# Se o parabrain roda em container, utilize o IP do host ou a URL pública dele.
PARABRAIN_URL = os.getenv("PARABRAIN_URL", "http://localhost:3000/api/external/save")
AGENT_API_KEY = os.getenv("AGENT_API_KEY", "sua-chave-secreta-e-segura-aqui")
USER_PHONE = os.getenv("USER_PHONE", "")  # Opcional (para múltiplos usuários)
USER_EMAIL = os.getenv("USER_EMAIL", "")  # Opcional (para múltiplos usuários)
# ---------------------

def main():
    parser = argparse.ArgumentParser(description="Save content to parabrain")
    parser.add_argument("--title", help="Note title")
    parser.add_argument("--body", help="Note body content")
    parser.add_argument("--url", help="URL link to save")
    parser.add_argument("--category", default="INBOX", help="PARA category (INBOX, PROJECT, etc.)")
    parser.add_argument("--tags", default="openclaw", help="Comma-separated tags")
    parser.add_argument("--file", help="Path to local file to upload")
    
    args = parser.parse_args()

    headers = {
        "Authorization": f"Bearer {AGENT_API_KEY}"
    }

    # Prepara os campos normais
    data = {
        "title": args.title or "",
        "body": args.body or "",
        "url": args.url or "",
        "category": args.category,
        "tags": args.tags,
        "phone": USER_PHONE,
        "email": USER_EMAIL
    }

    files = {}
    if args.file:
        if not os.path.exists(args.file):
            print(f"Erro: Arquivo '{args.file}' não existe.")
            sys.exit(1)
        
        # Detecta o tipo MIME do arquivo
        mime_type, _ = mimetypes.guess_type(args.file)
        if not mime_type:
            mime_type = "application/octet-stream"
        
        # Abre o arquivo para upload multipart
        filename = os.path.basename(args.file)
        files["file"] = (filename, open(args.file, "rb"), mime_type)

    try:
        response = requests.post(PARABRAIN_URL, headers=headers, data=data, files=files if files else None)
        
        # Fecha arquivos abertos se existirem
        for f in files.values():
            f[1].close()

        if response.status_code == 201:
            res_data = response.json()
            print(f"✅ Nota salva com sucesso no parabrain! ID: {res_data.get('noteId')}")
        else:
            try:
                err_msg = response.json().get("error", response.text)
            except Exception:
                err_msg = response.text
            print(f"❌ Erro ao salvar nota (HTTP {response.status_code}): {err_msg}")
            sys.exit(1)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Falha de conexão ao enviar para o parabrain: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

---

## 3. Como usar via Chat com OpenClaw

Uma vez que o skill está ativo no seu agente OpenClaw, você pode enviar mensagens de linguagem natural para ele:

*   **Texto:** *"Salve isso no parabrain: lembrar de pagar a conta de luz amanhã"*
*   **Link:** *"Guarde esse link no meu segundo cérebro: https://news.ycombinator.com"*
*   **Imagem/Arquivo:** *(Envie uma foto/PDF)* *"Salve essa imagem na inbox do parabrain"*
