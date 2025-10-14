run_dev:
	docker compose -f docker-compose.yml up -d

run_dev_build:
	docker compose -f docker-compose.yml up -d --build
