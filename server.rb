require 'webrick'
dir = File.expand_path(File.dirname(__FILE__))
server = WEBrick::HTTPServer.new(Port: (ENV['PORT'] || 3456).to_i, DocumentRoot: dir)
trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }
server.start
