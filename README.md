# VendingMachine_simulation

__Для запуска приложения необходимо:__
1) Открыть два окна терминала
2) В одном терминале написать ```node server.js``` (Этот терминал будет симулирвать работу торгового автомата)
3) Другой терминал необходимо использовать для запуска команд, к примеру:
   
```curl -X GET http://localhost:3000/machine```

или

```curl -X POST http://localhost:3000/machine/restock -H "Content-Type: application/json" -d '{"id": 1,"product": "Cola","price": 120,"stock": 10}' ```

Далее в терминале-2 будет выведен результат выполнения программы

Терминал-1:

<img width="500" height="36" alt="image" src="https://github.com/user-attachments/assets/bb46e22a-1a36-4c74-94dd-cf73e258f5eb" />


Терминал-2:

<img width="911" height="76" alt="image" src="https://github.com/user-attachments/assets/9cee7234-c90f-47c6-83b2-61ffb9f048ca" />


__ВОЗМОЖНЫЕ ВИДЫ ЗАПРОСОВ:__

1) GET /machine - возвращает состояние автомата
2) POST /machine/restock - пополнение автомата (```'{"id": 1,"product": "Cola","price": 120,"stock": 10}'```)
3) POST /machine/insert - ввод денег в автомат (```'{"amount": 120}'```)
4) POST /machine/select - выбор ID для покупки (```'{"slotId": 1}'```)
5) POST /machine/maintain - проведение техобслуживания

При попытке ввода несуществующей команды программа выдаёт ошибку с кодом 405 (это отображено в коде)

<img width="785" height="36" alt="image" src="https://github.com/user-attachments/assets/e6c75459-9bc2-47d7-a27a-f662b4005664" />

В коде учтены множество ошибок, коды не выводятся в соообщении, но сохраняются в статусе


__СТРУКТУРА__

server.js - программа, где прописана вся логика

VendingMashine.json - небольшая база данных, куда сохраняются данные о торговом автомате при выключении и программы и загружаются в оперативную память при запуске, чтобы не нагружать систему постоянными запросами в файл

остальные файлы были получены с помощью команды ```npm install express```
