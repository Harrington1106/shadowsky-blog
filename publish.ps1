# shadowsky blog publish script

Write-Host "🔄 Updating post index..."
npm run update-posts

Write-Host "✅ Post index updated."

# Optional: Git operations (uncomment if you use git)
# git add .
# git commit -m "Update posts"
# git push

Write-Host "🚀 Ready to deploy!"
# npm run deploy
