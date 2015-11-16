VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.box_url = "https://vagrantcloud.com/ubuntu/trusty64"
  config.ssh.forward_agent = true

  config.vm.network "private_network", type: "dhcp" 

  #config.vm.synced_folder ".", "/vagrant", type: "nfs"
  config.vm.synced_folder "../lunchmove", "/vagrant", type: "nfs"

  config.vm.hostname = 'lunchmove-dev'

  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.network "forwarded_port", guest: 80, host: 8081
  config.vm.network "forwarded_port", guest: 5432, host: 5433


  config.vm.provider "virtualbox" do |vb|
    vb.customize ["modifyvm", :id, "--memory", "2048"]
    # this fixes very slow download speed in the VM
    # http://superuser.com/questions/850357/how-to-fix-extremely-slow-virtualbox-network-download-speed
    # uncomment these two lines if you are having problems with download speeds
    # vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    # vb.customize ["modifyvm", :id, "--natdnsproxy1", "on"]
    # POSSIBLY those two lines above didn't actually work so a second possible solution is to try virtio driver, to do so uncomment the line below and provision
    # vb.customize ["modifyvm", :id, "--nictype1", "virtio"]
  end

  # COPIED FROM CHUCK - uncertain if this hack/fix is still needed
  # config.vm.provision "shell", run: "always" do |s|
  #   s.inline = 'sed --in-place -e "s:post-up route del default dev \\$IFACE$:post-up route del default dev \\$IFACE || true:g" /etc/network/interfaces'
  #   # HACK WARNING
  #   # fixes and issue with vagrant and cloud-init that causes you to have wait 3 minutes for the VM to start
  #   # see https://github.com/mitchellh/vagrant/issues/3860
  #   # this basically resets a setting created by the Vagrant built-in network configuration
  # end

end
