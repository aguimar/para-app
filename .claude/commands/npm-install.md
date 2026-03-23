Install npm packages inside the Docker container, then restart the app.

```bash
cd /Users/aguimar/Documents/devel/para/para-app && docker compose exec app npm install && docker compose restart app
```
