# 2183420_Trate

## Link to front-end
This is backend. This is the repository for frontend.
https://github.com/toska05/Trate/tree/main 

## How to build project in docker?
cp .env.example .env
ensure that all enivironmental variables are set

docker-compose --env-file .env up --build  


## How to set up docker in VM?
### Create a VM
Create an instance of VM (in google compute engine for example).
- OS: Ubuntu
- It's needed to enable HTTP and HTTPS trafic to VM
- 4 GB of RAM required to launch docker-compose with all functionality
- can be launched with 2 GB of RAM but local Llama conatiner wouldn't launch as it requires a bit of RAM. Everything else would run well (during project presentation 2 GB version was used)

SSH into VM
### Initialize back-end
Install docker by following instruction on their website (https://docs.docker.com/engine/install/ubuntu/)

Ensure that docker compose is installed (https://docs.docker.com/compose/install/linux/)

git clone https://github.com/Aviuss/2183420_Trate.git
cd 2183420_Trate
cp .env.example .env
ensure that all enivironmental variables are set (you can modify .env using 'sudo nano .env')

sudo docker compose --env-file .env up --build -d
### Set up a reverse proxy
create a firewall rule for port 80 for incomming traffic in vm
(https://www.youtube.com/watch?v=GTj-y8Osm3s&ab_channel=OrionOtterbein)
(tutorial for google virtual machine)

sudo apt install nginx
sudo rm -f /etc/nginx/sites-available/default
sudo touch /etc/nginx/sites-available/default

echo "server { listen 80; listen [::]:80; server_name _; location / { proxy_pass http://127.0.0.1:8081; include proxy_params; } }" | sudo tee /etc/nginx/sites-available/default

sudo service nginx restart
sudo service nginx reload

That's all!
service will run on http:/vm-ip