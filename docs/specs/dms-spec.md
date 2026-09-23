# Especificação - Document Management System

> Especificação funcional e técnica do DMS para orientar o desenvolvimento em
> etapas. Este documento é o contrato de entrada para a implementação do
> backend e do frontend.

## 1. Objetivo

Entregar uma aplicação web que permita a usuários identificados enviar,
consultar e baixar documentos armazenados exclusivamente no filesystem local da
aplicação.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos pertencentes ao usuário identificado.
- Download de um documento pelo identificador.
- Gestão simples por usuário, usando a identidade informada no contexto HTTP.
- Persistência dos arquivos em `backend/storage`.
- Persistência dos metadados em memória durante o ciclo de vida do processo.
- Interface React para upload, listagem e download, consumindo a API por `fetch`.

### Fora do escopo

- Armazenamento externo, em nuvem ou em serviços de upload de terceiros.
- Banco de dados ou persistência permanente dos metadados.
- Versionamento, histórico ou restauração de documentos.
- Autenticação completa, cadastro de usuários, sessões ou emissão de tokens.
- Compartilhamento de documentos entre usuários.
- Edição, conversão, visualização ou processamento do conteúdo dos arquivos.
- Busca textual, ordenação avançada e paginação nesta primeira versão.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento. | Uma requisição válida cria um arquivo local e retorna seus metadados. |
| RF-02 | O usuário deve ser identificado no upload. | A requisição sem `X-User-Id` válido é rejeitada antes da criação do documento. |
| RF-03 | O sistema deve validar o arquivo enviado. | Arquivo ausente, vazio, acima do limite ou com tipo não permitido resulta em erro HTTP documentado. |
| RF-04 | O sistema deve gerar um identificador único. | O identificador não depende do nome original e não permite interpretação como caminho. |
| RF-05 | O sistema deve registrar metadados. | O registro contém `id`, `originalName`, `size`, `uploadedAt` e `owner`. |
| RF-06 | O usuário pode listar seus documentos. | A listagem retorna somente os documentos cujo `owner` corresponde ao usuário atual. |
| RF-07 | O usuário pode baixar um documento. | Um documento existente e pertencente ao usuário é retornado como conteúdo binário. |
| RF-08 | O sistema deve impedir acesso indevido. | Um usuário não pode baixar ou consultar o documento de outro usuário. |
| RF-09 | O frontend deve exibir o fluxo principal. | A interface permite selecionar/enviar arquivo, visualizar a lista e iniciar o download. |
| RF-10 | O sistema deve informar falhas de forma consistente. | Erros de validação, autorização, ausência e infraestrutura retornam JSON padronizado. |
| RF-11 | O endpoint de saúde deve permanecer disponível. | `GET /health` retorna o estado operacional do processo. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados no filesystem local via `multer` com `diskStorage`. |
| RNF-02 | O diretório padrão de armazenamento deve ser `backend/storage`. |
| RNF-03 | Os metadados devem ser mantidos em memória nesta fase. Eles podem ser perdidos quando o processo reiniciar. |
| RNF-04 | A configuração deve ser fornecida por variáveis de ambiente, seguindo 12-Factor. |
| RNF-05 | O backend deve usar Node.js + Express em CommonJS e JavaScript sem TypeScript. |
| RNF-06 | O frontend deve usar React + Vite em ESM, com componentes funcionais e Hooks. |
| RNF-07 | A comunicação do frontend com a API deve usar `fetch` pelo prefixo `/api`, usando o proxy do Vite em desenvolvimento. |
| RNF-08 | As camadas devem respeitar `routes -> controllers -> services -> repositories`. |
| RNF-09 | O sistema não deve confiar em caminhos, nomes de arquivos ou identificadores fornecidos pelo cliente para acessar o filesystem. |
| RNF-10 | Mensagens HTTP e textos da interface devem ser em português; nomes de símbolos e campos técnicos permanecem em inglês. |
| RNF-11 | O processamento deve evitar carregar arquivos inteiros em memória; o upload e o download devem usar os mecanismos de stream do Node/Multer quando aplicável. |
| RNF-12 | O sistema deve retornar erros previsíveis sem expor caminhos internos, stack traces ou detalhes sensíveis ao cliente. |

## 5. Modelo de dados

### 5.1 Metadados públicos do documento

Os metadados abaixo são mantidos em uma coleção em memória e compõem as
respostas JSON da API.

| Campo | Tipo | Obrigatório | Descrição e regras |
| --- | --- | --- | --- |
| `id` | `string` | Sim | Identificador opaco, único no processo, gerado pelo servidor. Deve ser seguro para uso em uma URL e não pode conter separadores de diretório. |
| `originalName` | `string` | Sim | Nome original informado pelo cliente, normalizado para remover caminhos e caracteres de controle. Não deve ser usado como caminho físico. |
| `size` | `number` | Sim | Tamanho do arquivo em bytes, maior que zero e limitado por `MAX_FILE_SIZE_BYTES`. |
| `uploadedAt` | `string` | Sim | Data e hora de criação em ISO 8601 UTC, por exemplo `2026-09-23T12:00:00.000Z`. |
| `owner` | `string` | Sim | Identificador do usuário obtido de `X-User-Id`, após validação e normalização. |

O campo `owner` não deve ser aceito como campo do formulário nem como valor de
query string. Ele é derivado exclusivamente do contexto da requisição.

### 5.2 Registro interno de armazenamento

O repositório pode manter internamente o mapeamento entre `id` e o arquivo
físico. O nome físico recomendado é o próprio `id`, sem reutilizar
`originalName` e sem incluir uma barra. Esse detalhe não deve ser exposto como
um caminho na API.

A resolução do arquivo deve sempre ser feita pelo repositório a partir de um
registro previamente encontrado por `id` e `owner`. O cliente nunca fornece o
caminho absoluto ou relativo.

### 5.3 Ciclo de vida

1. O arquivo é aceito pelo `multer` e gravado no diretório configurado.
2. O service valida o resultado e cria o metadado em memória.
3. O repository associa o `id` ao arquivo físico.
4. Em caso de falha ao persistir o metadado, o arquivo parcialmente criado deve
   ser removido quando possível.
5. Após reinício do processo, os arquivos podem continuar no filesystem, mas os
   metadados em memória não são recuperados nesta versão. Esses arquivos órfãos
   não devem ser listados nem baixados sem um registro correspondente.

## 6. Contratos de API

### 6.1 Convenções gerais

- Base URL do frontend: `/api`.
- Content-Type para JSON: `application/json`.
- Content-Type para upload: `multipart/form-data` gerado pelo cliente; não
  definir manualmente o boundary no frontend.
- O cabeçalho `X-User-Id` é obrigatório nos endpoints de documentos.
- O valor de `X-User-Id` deve ser uma string não vazia, limitada a 100
  caracteres, sem caracteres de controle. O formato exato de autenticação fica
  fora do escopo desta versão.
- Respostas de sucesso e erro não devem expor o caminho do filesystem.

### 6.2 POST /upload

Envia um documento para o usuário atual.

**Cabeçalhos**

```http
X-User-Id: user-123
Content-Type: multipart/form-data; boundary=...
```

**Corpo**

O corpo deve conter exatamente um campo de arquivo chamado `file`.

**Resposta de sucesso: `201 Created`**

```json
{
  "id": "8e5d9d7e-2f15-4a94-9a22-3d5f0c2f4b11",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-09-23T12:00:00.000Z",
  "owner": "user-123"
}
```

**Erros esperados**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `MISSING_USER` | `X-User-Id` ausente ou inválido. |
| `400` | `MISSING_FILE` | Campo `file` ausente. |
| `400` | `INVALID_FILE` | Tipo, nome ou conteúdo do arquivo inválido. |
| `413` | `FILE_TOO_LARGE` | Arquivo acima de `MAX_FILE_SIZE_BYTES`. |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | MIME type não permitido. |
| `500` | `STORAGE_ERROR` | Falha ao gravar ou registrar o arquivo. |

### 6.3 GET /documents

Lista os documentos do usuário atual.

**Cabeçalhos**

```http
X-User-Id: user-123
```

**Resposta de sucesso: `200 OK`**

```json
{
  "documents": [
    {
      "id": "8e5d9d7e-2f15-4a94-9a22-3d5f0c2f4b11",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-09-23T12:00:00.000Z",
      "owner": "user-123"
    }
  ]
}
```

A ordenação padrão deve ser do documento mais recente para o mais antigo,
conforme `uploadedAt`. Uma lista vazia deve retornar `200` com
`{"documents": []}`.

**Erros esperados**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `MISSING_USER` | `X-User-Id` ausente ou inválido. |
| `500` | `REPOSITORY_ERROR` | Falha ao consultar os metadados em memória. |

### 6.4 GET /documents/:id/download

Baixa o conteúdo binário de um documento pertencente ao usuário atual.

**Cabeçalhos**

```http
X-User-Id: user-123
```

**Resposta de sucesso: `200 OK`**

- Corpo binário do arquivo.
- `Content-Type` derivado do tipo validado no upload, ou
  `application/octet-stream` quando não houver tipo específico.
- `Content-Disposition: attachment; filename="relatorio.pdf"` usando o nome
  normalizado, nunca um caminho recebido do cliente.

**Erros esperados**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `MISSING_USER` | `X-User-Id` ausente ou inválido. |
| `400` | `INVALID_DOCUMENT_ID` | Identificador vazio ou fora do formato aceito. |
| `404` | `DOCUMENT_NOT_FOUND` | Documento inexistente, sem metadado ou pertencente a outro usuário. |
| `410` | `FILE_NOT_AVAILABLE` | Metadado existe, mas o arquivo físico não está disponível. |
| `500` | `STORAGE_ERROR` | Falha ao abrir ou transmitir o arquivo. |

A resposta para documento inexistente e documento de outro usuário deve ser a
mesma, evitando revelar a existência de documentos de terceiros.

### 6.5 GET /health

Endpoint operacional existente, sem necessidade de identificação de usuário.

**Resposta de sucesso: `200 OK`**

```json
{
  "status": "ok"
}
```

### 6.6 Formato de erro

Todos os erros HTTP JSON devem seguir o formato:

```json
{
  "error": {
    "code": "MISSING_FILE",
    "message": "O arquivo é obrigatório."
  }
}
```

`code` é estável para consumo programático. `message` é legível e não deve
conter stack trace, caminho local ou informação de outro usuário.

## 7. Validação e segurança

### 7.1 Upload

- Aceitar somente uma parte `file` por requisição.
- Rejeitar arquivo ausente e arquivo vazio.
- Aplicar `MAX_FILE_SIZE_BYTES` no Multer e no service.
- Validar o MIME type recebido contra `ALLOWED_MIME_TYPES`.
- Quando possível, comparar o MIME type com a extensão normalizada; não confiar
  exclusivamente no nome original enviado pelo cliente.
- Remover caminhos, barras, caracteres de controle e nomes especiais do nome
  original antes de devolvê-lo ou usá-lo em `Content-Disposition`.
- Não permitir que o nome original defina o nome ou o diretório físico.
- Gerar `id` no servidor e usar somente esse identificador para o arquivo
  físico.

### 7.2 Identificação e autorização

- Exigir `X-User-Id` em todos os endpoints de documentos.
- O owner deve ser definido no servidor a partir desse cabeçalho.
- Listagem, download e qualquer operação futura devem filtrar por `owner`.
- Não aceitar `owner` no corpo do upload, em query string ou em parâmetros de
  rota.
- Esta identidade é um mecanismo simples para a primeira versão, não substitui
  autenticação e autorização de produção.

### 7.3 Proteção do filesystem

- Resolver o caminho somente a partir do diretório configurado e do `id`
  validado.
- Rejeitar identificadores com `/`, `\\`, `..`, bytes nulos ou caracteres fora
  do formato definido.
- Nunca concatenar diretamente uma entrada de usuário a um caminho sem
  validação.
- Manter o diretório de upload fora da área de arquivos públicos do frontend.
- Não retornar caminhos absolutos, nomes internos ou stack traces.

## 8. Configuração

A aplicação deve ler configuração do ambiente, com os seguintes valores
iniciais:

| Variável | Obrigatória | Default | Descrição |
| --- | --- | --- | --- |
| `PORT` | Não | `3000` | Porta HTTP do backend. |
| `STORAGE_PATH` | Não | `backend/storage` | Diretório local para arquivos enviados. Deve ser resolvido com segurança. |
| `MAX_FILE_SIZE_BYTES` | Não | `10485760` | Limite de 10 MiB por arquivo. |
| `ALLOWED_MIME_TYPES` | Não | `application/pdf,text/plain,image/png,image/jpeg` | Lista separada por vírgulas de tipos aceitos. |
| `VITE_API_BASE_URL` | Não | `/api` | Prefixo usado pelo frontend para chamadas à API. |

A aplicação deve validar valores inválidos na inicialização ou no primeiro uso
configurado e emitir mensagens claras no log. Não há segredos obrigatórios nesta
fase. Valores sensíveis, caso sejam adicionados no futuro, não devem ser
versionados.

## 9. Decisões arquiteturais

### 9.1 Backend

O backend seguirá uma Clean Architecture simples dentro de `backend/src`:

```text
routes -> controllers -> services -> repositories
```

- `routes/`: registra métodos, caminhos, middleware do Multer e delega para os
  controllers. Não contém regra de negócio.
- `controllers/`: lê cabeçalhos, parâmetros e arquivo, faz validação HTTP
  básica, chama o service e traduz resultados para status e JSON.
- `services/`: concentra regras de negócio, autorização por proprietário,
  geração/validação de metadados e coordenação entre upload e repositório.
- `repositories/`: abstrai o armazenamento local: arquivos via
  `multer`/`diskStorage` e metadados em memória. Não conhece detalhes HTTP.
- `app.js`: configura Express, middlewares, rotas e o endpoint `/health`.

As camadas internas não devem depender de Express, Multer ou detalhes de
transporte além das interfaces necessárias. A implementação deve preferir
funções pequenas, dependências explícitas e as dependências já presentes no
`package.json`.

### 9.2 Frontend

O frontend usará React + Vite, organizado em:

- `components/`: controles reutilizáveis de upload, lista e download.
- `pages/`: composição da tela principal do DMS.
- `services/`: funções `fetch` para encapsular os contratos da API.

O Vite encaminhará `/api` para o backend durante o desenvolvimento. O frontend
deve tratar estados de carregamento, lista vazia, sucesso e erro sem duplicar a
lógica de comunicação.

### 9.3 Armazenamento

O armazenamento é estritamente local. Não usar S3, banco de dados, Firebase,
serviços externos ou qualquer provedor de upload. O diretório configurado deve
existir ou ser criado pelo processo de inicialização, respeitando as permissões
do ambiente.

## 10. Tratamento de erros e observabilidade

- Erros de entrada devem ser convertidos em respostas `4xx` previsíveis.
- Falhas de filesystem e de repositório devem ser convertidas em `5xx` sem
  vazar detalhes internos.
- O middleware de erro deve tratar especificamente os erros do Multer, incluindo
  limite de tamanho e excesso de arquivos.
- Os logs devem ser enviados para stdout/stderr e conter evento, método, rota,
  status e duração quando disponíveis.
- Não registrar conteúdo de arquivos, credenciais, caminhos absolutos ou dados
  desnecessários de usuários.
- O endpoint `/health` deve permanecer simples e não depender de um documento
  específico.

## 11. Plano de testes

Os testes backend devem usar o runner nativo `node:test`, sem adicionar outro
framework nesta fase.

### 11.1 Testes funcionais

- `GET /health` retorna `200` e `{ "status": "ok" }`.
- Upload válido retorna `201` e todos os metadados esperados.
- Upload sem arquivo retorna `400`.
- Upload sem `X-User-Id` retorna `400`.
- Upload acima do limite retorna `413`.
- Upload com MIME não permitido retorna `415`.
- Listagem retorna somente documentos do usuário atual.
- Listagem vazia retorna `200` com array vazio.
- Download válido retorna o conteúdo e os headers esperados.
- Download de documento inexistente retorna `404` sem revelar dados.
- Download de documento de outro usuário também retorna `404`.
- Metadado sem arquivo físico retorna `410`.

### 11.2 Testes de segurança e consistência

- IDs com `..`, barras, bytes nulos ou formato inválido não acessam o
  filesystem.
- Nomes originais com caminho não escapam do diretório de armazenamento.
- O cliente não consegue substituir o `owner` enviando um campo no formulário.
- Falha de registro do metadado não deixa arquivo parcial quando a remoção for
  possível.
- Respostas de erro não expõem stack trace nem caminhos locais.
- O processo não recupera metadados antigos após reinício, conforme a limitação
  declarada.

Os testes devem usar diretório temporário isolado e limpar arquivos criados ao
final de cada caso.

## 12. Limitações conhecidas

- Os metadados vivem apenas na memória e são perdidos no reinício do processo.
- Arquivos físicos podem se tornar órfãos após reinício ou falha antes do
  registro do metadado; limpeza automática não faz parte desta versão.
- Não existe autenticação real nem mecanismo de sessão.
- O armazenamento local não é adequado para múltiplas instâncias sem uma
  estratégia compartilhada, que está fora do escopo.
- Não há versionamento, auditoria, paginação ou busca textual.
- Os limites e tipos padrão são uma proteção inicial, não substituem uma
  política completa de segurança de arquivos.

## 13. Plano de execução

1. **Especificação:** criar e revisar este documento, confirmando contratos,
   regras de segurança, variáveis de ambiente e critérios de aceite.
2. **Backend - infraestrutura:** configurar Express, diretório local,
   `multer` com `diskStorage`, configuração de ambiente e tratamento de erros.
3. **Backend - repositório:** implementar o armazenamento de arquivos e a
   coleção de metadados em memória, com resolução segura por `id` e `owner`.
4. **Backend - regras e API:** implementar services, controllers e routes para
   upload, listagem, download e health check.
5. **Backend - testes:** adicionar testes `node:test` para fluxos felizes,
   validações, isolamento por usuário, erros de filesystem e path traversal.
6. **Frontend:** criar a página principal, componentes de upload/listagem/
   download e services baseados em `fetch` pelo prefixo `/api`.
7. **Integração:** validar o fluxo completo entre Vite, proxy, backend,
   filesystem local e estados de erro da interface.
8. **Revisão de segurança e qualidade:** revisar limites, sanitização,
   autorização, logs, responsabilidades das camadas e ausência de dependências
   externas de armazenamento.
9. **Automação:** configurar execução repetível de testes e build do frontend
   em CI, sem alterar a restrição de armazenamento local.

A implementação de código começa somente após a aprovação desta especificação.
