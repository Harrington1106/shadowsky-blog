// st.js - 科技页面功能
// =================================================================
// 1. 科技动态数据模型
// =================================================================
const techDynamics = [
    {
        title: "AI技术突破",
        type: "人工智能",
        description: "最新深度学习模型在自然语言处理领域取得重大突破，准确率提升至95%。",
        time: "2小时前",
        tags: ["AI", "深度学习", "NLP"]
    },
    {
        title: "量子计算进展",
        type: "量子技术",
        description: "研究人员成功实现100量子比特的量子计算机原型，计算能力显著提升。",
        time: "5小时前",
        tags: ["量子计算", "物理", "创新"]
    },
    {
        title: "Web3发展",
        type: "区块链",
        description: "去中心化应用生态系统持续扩大，用户数量突破千万大关。",
        time: "1天前",
        tags: ["区块链", "Web3", "去中心化"]
    }
];

// =================================================================
// 2. 技术领域数据
// =================================================================
const techDomains = [
    {
        title: "人工智能与机器学习",
        type: "AI/ML",
        image: "img/avatar.jpg",
        description: "探索深度学习、神经网络和智能算法的前沿应用与发展趋势。",
        details: "包含计算机视觉、自然语言处理等",
        tags: ["深度学习", "神经网络", "算法"]
    },
    {
        title: "Web开发技术",
        type: "前端",
        image: "img/avatar.jpg",
        description: "现代Web开发框架、工具链和最佳实践，打造优秀的用户体验。",
        details: "React、Vue、Next.js等框架",
        tags: ["前端", "框架", "用户体验"]
    },
    {
        title: "移动应用开发",
        type: "移动端",
        image: "img/avatar.jpg",
        description: "iOS和Android平台开发技术，跨平台解决方案与原生性能优化。",
        details: "Flutter、React Native、原生开发",
        tags: ["移动开发", "跨平台", "性能优化"]
    },
    {
        title: "云计算与DevOps",
        type: "云技术",
        image: "img/avatar.jpg",
        description: "云原生架构、容器化部署和自动化运维的最佳实践。",
        details: "Docker、Kubernetes、CI/CD",
        tags: ["云计算", "DevOps", "自动化"]
    },
    {
        title: "数据科学与分析",
        type: "数据",
        image: "img/avatar.jpg",
        description: "大数据处理、可视化分析和机器学习模型的实际应用。",
        details: "Python、SQL、数据可视化",
        tags: ["数据科学", "分析", "可视化"]
    },
    {
        title: "网络安全技术",
        type: "安全",
        image: "img/avatar.jpg",
        description: "网络安全防护、加密技术和漏洞分析的现代解决方案。",
        details: "加密、防火墙、渗透测试",
        tags: ["网络安全", "加密", "防护"]
    }
];

// =================================================================
// 3. 科技产品数据
// =================================================================
const techProducts = [
    {
        name: "智能助手应用",
        category: "移动应用",
        description: "基于AI的个人助手，支持语音交互和智能日程管理。",
        status: "开发中",
        tech: ["React Native", "TensorFlow", "Node.js"]
    },
    {
        name: "数据分析平台",
        category: "Web应用",
        description: "可视化数据分析工具，支持多种数据源和实时图表。",
        status: "已上线",
        tech: ["Vue.js", "Python", "D3.js"]
    },
    {
        name: "代码生成器",
        category: "开发工具",
        description: "自动化代码生成工具，提升开发效率和代码质量。",
        status: "测试中",
        tech: ["TypeScript", "AST", "CLI"]
    }
];

// =================================================================
// 4. 开发工具数据
// =================================================================
const devTools = [
    {
        name: "VS Code",
        category: "编辑器",
        description: "轻量级但功能强大的代码编辑器，支持多种编程语言。",
        features: ["智能提示", "调试", "Git集成"]
    },
    {
        name: "Git",
        category: "版本控制",
        description: "分布式版本控制系统，协作开发必备工具。",
        features: ["分支管理", "代码审查", "版本追踪"]
    },
    {
        name: "Docker",
        category: "容器化",
        description: "应用容器化平台，实现环境一致性和快速部署。",
        features: ["容器管理", "镜像构建", "编排"]
    },
    {
        name: "Postman",
        category: "API测试",
        description: "API开发和测试工具，支持自动化测试和文档生成。",
        features: ["API测试", "自动化", "文档"]
    }
];

// =================================================================
// 5. 学习资源数据
// =================================================================
const learningResources = [
    {
        title: "MDN Web文档",
        type: "文档",
        description: "最全面的Web技术文档，涵盖HTML、CSS、JavaScript等。",
        link: "https://developer.mozilla.org",
        level: "所有级别"
    },
    {
        title: "freeCodeCamp",
        type: "教程",
        description: "免费的编程学习平台，包含完整的前后端开发课程。",
        link: "https://freecodecamp.org",
        level: "初学者"
    },
    {
        title: "Stack Overflow",
        type: "社区",
        description: "开发者问答社区，解决编程问题的首选平台。",
        link: "https://stackoverflow.com",
        level: "所有级别"
    },
    {
        title: "GitHub Learning Lab",
        type: "实践",
        description: "通过实际操作学习Git和GitHub的使用。",
        link: "https://lab.github.com",
        level: "初学者"
    }
];

// =================================================================
// 6. 核心渲染函数
// =================================================================

/**
 * 动态生成科技动态卡片
 */
function generateTechDynamics() {
    const container = document.getElementById('techDynamicsContainer');
    if (!container) return;

    const dynamicsHTML = techDynamics.map(dynamic => {
        const tagsHTML = dynamic.tags.map(tag => `<span class="tech-tag">${tag}</span>`).join('');
        return `
            <div class="tech-card">
                <h3>${dynamic.title}</h3>
                <p>${dynamic.description}</p>
                <div style="margin-top: 15px;">
                    ${tagsHTML}
                </div>
                <small style="color: rgba(255,255,255,0.6);">${dynamic.time}</small>
            </div>
        `;
    }).join('');

    container.innerHTML = dynamicsHTML;
}

/**
 * 动态生成技术领域卡片
 */
function generateTechDomains() {
    const container = document.getElementById('techDomainsContainer');
    if (!container) return;

    const domainsHTML = techDomains.map(domain => {
        const tagsHTML = domain.tags.map(tag => `<span class="tech-tag">${tag}</span>`).join('');
        return `
            <div class="domain-card">
                <img src="${domain.image}" alt="${domain.title}" class="domain-card-image" onerror="this.onerror=null;this.src='img/avatar.jpg';">
                <div class="domain-card-content">
                    <h3>${domain.title}</h3>
                    <p>${domain.description}</p>
                    <div style="margin: 10px 0;">
                        ${tagsHTML}
                    </div>
                    <small>${domain.details}</small>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = domainsHTML;
}

/**
 * 动态生成产品卡片
 */
function generateProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    const productsHTML = techProducts.map(product => {
        const techTags = product.tech.map(tech => `<span class="tech-tag">${tech}</span>`).join('');
        const statusColor = product.status === '已上线' ? '#4CAF50' : product.status === '开发中' ? '#FF9800' : '#9C27B0';

        return `
            <div class="product-card">
                <h3>${product.name}</h3>
                <p><strong>分类:</strong> ${product.category}</p>
                <p>${product.description}</p>
                <div style="margin: 10px 0;">
                    ${techTags}
                </div>
                <small style="color: ${statusColor}">
                    状态: ${product.status}
                </small>
            </div>
        `;
    }).join('');

    container.innerHTML = productsHTML;
}

/**
 * 动态生成开发工具卡片
 */
function generateDevTools() {
    const container = document.getElementById('devToolsContainer');
    if (!container) return;

    const toolsHTML = devTools.map(tool => {
        const featuresHTML = tool.features.map(feature => `<span class="tech-tag">${feature}</span>`).join('');
        return `
            <div class="tool-card">
                <h3>${tool.name}</h3>
                <p><strong>分类:</strong> ${tool.category}</p>
                <p>${tool.description}</p>
                <div style="margin: 10px 0;">
                    ${featuresHTML}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = toolsHTML;
}

/**
 * 动态生成学习资源卡片
 */
function generateLearningResources() {
    const container = document.getElementById('learningResourcesContainer');
    if (!container) return;

    const resourcesHTML = learningResources.map(resource => {
        return `
            <div class="resource-card">
                <h3>${resource.title}</h3>
                <p><strong>类型:</strong> ${resource.type}</p>
                <p>${resource.description}</p>
                <p><strong>适合:</strong> ${resource.level}</p>
                <a href="${resource.link}" target="_blank" style="color: #2196F3; text-decoration: none;">
                    访问资源 →
                </a>
            </div>
        `;
    }).join('');

    container.innerHTML = resourcesHTML;
}

// =================================================================
// 7. 页面初始化及交互逻辑
// =================================================================

/**
 * 页面初始化主函数
 */
function initTechPage() {
    fetch('/data/tech.json').then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{
        if (j) {
            if (Array.isArray(j.dynamics)) window.techDynamics = j.dynamics;
            if (Array.isArray(j.domains)) window.techDomains = j.domains;
            if (Array.isArray(j.products)) window.techProducts = j.products;
            if (Array.isArray(j.tools)) window.devTools = j.tools;
            if (Array.isArray(j.resources)) window.learningResources = j.resources;
        }
        generateTechDynamics();
        generateTechDomains();
        generateProducts();
        generateDevTools();
        generateLearningResources();

        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target); } });
        }, { threshold: 0.1 });
        document.querySelectorAll('.tech-card,.domain-card,.product-card,.tool-card,.resource-card').forEach(el => {
            el.classList.add('reveal-up');
            observer.observe(el);
        });
    });

    // 汉堡菜单功能
    const navToggle = document.getElementById("navToggle");
    const navMenu = document.querySelector(".navbar-menu");
    if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
    }

    // 添加技术领域卡片点击效果 (简单动画反馈)
    const domainCards = document.querySelectorAll('.domain-card');
    domainCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // 模拟实时更新科技动态
    setInterval(() => {
        // 这里可以添加实时数据更新的逻辑
        console.log('检查科技动态更新...');
    }, 60000); // 每分钟检查一次
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initTechPage);