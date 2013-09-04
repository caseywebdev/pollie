dev:
	$(MAKE) -j redis server

redis:
	mkdir -p log &&	redis-server /usr/local/etc/redis.conf >> log/redis.log 2>&1

server:
	node_modules/.bin/watchy -w . -- node server
