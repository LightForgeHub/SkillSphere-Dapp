.PHONY: sandbox sandbox-stop sandbox-logs

sandbox:
	@bash scripts/sandbox.sh

sandbox-stop:
	@docker stop skillsphere-sandbox 2>/dev/null || true

sandbox-logs:
	@docker logs -f skillsphere-sandbox