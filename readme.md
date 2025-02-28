# Como Executar o Projeto
Este projeto utiliza **Docker** e **Docker Compose**, então certifique-se de que ele está instalado em sua máquina antes de prosseguir.

## Portas utilizadas
* Backend: 3333
* Frontend: 3000

## Clonando o Repositório

```bash
git clone https://github.com/jessicamedeirosp/projeto-ambev.git
cd projeto-ambev
```

## Executando o Backend
```bash
cd backend 
npm install
docker-compose up -d
npm run start:dev
```
## Executando o Frontend

**Primeiro abra outro terminal na raiz do projeto**

```bash
cd frontend
npm install
npm run dev
```
