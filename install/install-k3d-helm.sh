
#!/usr/bin/env bash
set -Eeuo pipefail

echo "========================================"
echo " INSTALL DOCKER, KUBECTL, K3D & HELM"
echo "========================================"

# Check Ubuntu
if [[ ! -f /etc/os-release ]]; then
    echo "OS tidak terdeteksi."
    exit 1
fi

source /etc/os-release

if [[ "$ID" != "ubuntu" ]]; then
    echo "Script ini ditujukan untuk Ubuntu."
    exit 1
fi

ARCH="$(dpkg --print-architecture)"

echo "[1/5] Update system packages..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl wget gnupg

# ---------------------------------------
# 2. INSTALL DOCKER ENGINE
# ---------------------------------------
echo "[2/5] Installing Docker Engine..."

sudo install -m 0755 -d /etc/apt/keyrings

if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
    sudo curl -fsSL \
      https://download.docker.com/linux/ubuntu/gpg \
      -o /etc/apt/keyrings/docker.asc
fi

sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: ${ARCH}
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt-get update

sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

sudo systemctl enable --now docker

# Allow current user to execute Docker without sudo
sudo usermod -aG docker "$USER"

# ---------------------------------------
# 3. INSTALL KUBECTL
# ---------------------------------------
echo "[3/5] Installing kubectl..."

K8S_VERSION="$(curl -fsSL https://dl.k8s.io/release/stable.txt)"

curl -fsSLo /tmp/kubectl \
    "https://dl.k8s.io/release/${K8S_VERSION}/bin/linux/${ARCH}/kubectl"

sudo install -o root -g root -m 0755 \
    /tmp/kubectl /usr/local/bin/kubectl

rm -f /tmp/kubectl

# ---------------------------------------
# 4. INSTALL K3D
# ---------------------------------------
echo "[4/5] Installing k3d..."

curl -fsSL https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh \
    | TAG="${K3D_VERSION:-}" bash

# ---------------------------------------
# 5. INSTALL HELM 3
# ---------------------------------------
echo "[5/5] Installing Helm..."

curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \
    -o /tmp/get_helm.sh

chmod 700 /tmp/get_helm.sh
/tmp/get_helm.sh

rm -f /tmp/get_helm.sh

# ---------------------------------------
# VERIFICATION
# ---------------------------------------
echo ""
echo "========================================"
echo " INSTALLATION VERIFICATION"
echo "========================================"

echo "Docker:"
sudo docker --version

echo ""
echo "Kubectl:"
kubectl version --client

echo ""
echo "k3d:"
k3d version

echo ""
echo "Helm:"
helm version --short

echo ""
echo "Docker service:"
sudo systemctl is-active docker

echo ""
echo "========================================"
echo " INSTALLATION COMPLETED"
echo "========================================"

echo ""
echo "IMPORTANT:"
echo "Log out and log in again to activate"
echo "Docker group permissions."
echo ""
echo "No Kubernetes cluster has been created."
