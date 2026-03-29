# 🚨 ERB Ocorrências

Sistema web para registro, acompanhamento e gerenciamento de ocorrências operacionais.

## 📌 Sobre o Projeto

O **ERB Ocorrências** é uma aplicação desenvolvida para auxiliar no controle de ocorrências em ambientes operacionais, permitindo o registro, acompanhamento e análise de eventos de forma estruturada.

O sistema foi projetado com foco em simplicidade, organização e eficiência, sendo ideal para uso administrativo interno.

---

## ⚙️ Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Supabase (Banco de dados + API REST)
- Cloudflare Pages (Deploy)

---

## 🚀 Funcionalidades

- ✅ Cadastro de ocorrências (CRUD completo)
- ✅ Edição e exclusão de registros
- ✅ Alteração de status (aberta, em andamento, encerrada)
- ✅ Filtros por:
  - Tipo
  - Setor
  - Status
  - Data
- ✅ Upload de fotos e documentos
- ✅ Visualização detalhada de ocorrências
- ✅ Histórico de alterações
- ✅ Geração de relatório em PDF
- ✅ Paginação de resultados

---

## 🧠 Arquitetura

O sistema utiliza uma abordagem **frontend + backend via BaaS (Backend as a Service)**:

- O frontend é responsável pela interface e lógica de interação
- O Supabase fornece:
  - Banco de dados PostgreSQL
  - API REST automática
  - Armazenamento de arquivos (Storage)

Além disso, foi implementado um **interceptador de fetch**, que transforma chamadas no formato:
