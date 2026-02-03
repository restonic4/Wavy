# Kill you local connection
sudo tc qdisc replace dev lo root netem delay 600ms 200ms rate 250kbit loss 10%

or worse:

sudo tc qdisc replace dev lo root netem delay 2000ms 500ms rate 40kbit loss 25%

# Restore
sudo tc qdisc del dev lo root