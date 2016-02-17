---
layout: post
title: CocoaPods详解
date: 2016.01.24
categories: objective-c
---

# CocoaPods简介
相信写过iOS程序的同学们都应该就接触过CocoaPods的，他就是iOS界的Maven，帮助开发者们管理着程序依赖的第三方framework乃至自己拆分出来的framework。通过简单的在Podfile中配置项目的依赖，CocoaPods将自动递归地寻找依赖，获取源码并创建工程。cocoaPods的使用是非常直观的，本文主要不介绍CocoaPods的使用，而是简单的探寻其背后的原理和实现。

以下是使用CocoaPods的几乎全部文档，附上创送门，给需要的孩子。

+ [CocoaPods的安装](http://guides.cocoapods.org/using/getting-started.html#installation)
+ [Podfile参考文档](https://guides.cocoapods.org/syntax/podfile.html)
+ [Podspec参考文档](https://guides.cocoapods.org/syntax/podspec.html)
+ [Pod命令参考](https://guides.cocoapods.org/terminal/commands.html#commands)

# Project&&Target&&Workspace&&Scheme
[参考文档](https://developer.apple.com/library/ios/featuredarticles/XcodeConcepts/Concept-Targets.html#//apple_ref/doc/uid/TP40009328-CH4-SW1)
## Target
一个project可以包含一个或者多个target，每个target对应生成一个产品。
每个target定义了相应的产品，并管理构建这个产品所需要的源文件和处理这些文件的指令。处理文件的指令主要由build settings和build phases决定。target的build settings继承自project的build settings，但可以在target覆盖修改。

## Project
Project可以单独存在，也可以包含在workspace中；Project包含一个或多个target，用于构建一个或多个产品。Project管理着所有的文件、资源以及构建一个或者多个软件所需要的信息。同时也为所有的target提供默认的build settings。
一个Project文件包含以下信息：

+ 源文件相关，包含源代码、库和framework、资源文件、nibs等
+ 用来管理源文件的组信息
+ Project层级的配置信息
+ Targets
+ 用于调试或测试程序的可执行环境

## Workspace
一个workspace可以包含多个projects，以及其他任何你想要管理的文件。workspace是个Xcode文档，将projects和其他文档组合，方便一起管理。workspace还隐性的或者显性的提供了其包含的projects以及他们的targets之间的关系。
workspace让Projects之间的工作变得简单，比如代码自动提示、跳转到定义等等。在一个workspace中的projects共享一个build目录，不同的workspace拥有不同的build目录。所以workspace能提供隐性的依赖关系解决，同时通过配置来提供显性的关系解决。

## Scheme
scheme定义了一组需要构建的targets，以及构建时需要的配置和一组需要执行的test

# Xcode Command Line

## xcrun
xcrun可以用来定位Xcode的开发者工具，也可以用来调用Xcode的开发者工具
```shell
xcrun --sdk iphoneos9.0 --find clang

 # sample result
 # /Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/clang
```

## xcodebuild
xcodebuild用于构建Xcode工程中的一个或者多个target，或者构建Xcode工程或者workspace中的scheme
```shell
xcodebuild -project MyProject.xcodeproj -target Target1 -target Target2 -configuration Debug
```

## xcode-select
xcode-select控制xcrun、xcodebuild、cc以及其他xcode和BSD开发工具的developer目录，他使得不同版本xcode工具之间的切换变得简单。
```shell
xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

## xcodeproj
[xcodeproj](http://www.rubydoc.info/gems/xcodeproj)
xcodeproj是ruby写的用来创建和修改xcode工程的工具。


# CocoaPods
前面讲了那么多准备知识，对于理解cocoapods的源码还是非常有用的。下面我们正式进入cocoapods的源码解析。[CocoaPods源码地址](https://github.com/CocoaPods/CocoaPods)

CocoaPods的源码结构为:
```
CocoaPods
    - bin        : pod和sandbox-pod命令目录
    - example    : pod用法示例
    - lib        : 真正的pod源码库
        - cocoapods
            - command
            - downloader
            - external_sources
            - generator
            - installer
            - resolver
            - sandbox
            - target
            - user_interface
        - cocoapods.rb 包含了主要module和类的文件
    - spec       : rspec单元测试的目录
```

以上的目录结构，主要是按照模块功能划分的，总体来看分的还是比较清晰的。

下面简单来看看cocoapods.rb文件
```ruby
  # 用于存储target相关的信息，整合pods下target的信息
  autoload :AggregateTarget,           'cocoapods/target/aggregate_target'

  # 实现了pod下的各种命令，具体的命令可以通过pod --help来查看
  autoload :Command,                   'cocoapods/command'

  # 用于移除cocoapods
  autoload :Deintegrator,              'cocoapods_deintegrate'

  # 用于支持可执行文件执行的模块
  autoload :Executable,                'cocoapods/executable'

  # 用于初始化外部资源类
  autoload :ExternalSources,           'cocoapods/external_sources'

  # 负责根据podfile生成Pods库
  autoload :Installer,                 'cocoapods/installer'

  # 提供了cocoapods的hook机制，便于plugins的编写
  autoload :HooksManager,              'cocoapods/hooks_manager'

  # 保存target的信息，用来编译单个pod
  autoload :PodTarget,                 'cocoapods/target/pod_target'

  # pod工程
  autoload :Project,                   'cocoapods/project'

  # 根据Podfile生成target的specifications
  autoload :Resolver,                  'cocoapods/resolver'

  # 用于支持Cocoapods install的时候用的目录操作
  autoload :Sandbox,                   'cocoapods/sandbox'

  # 管理所有的源代码
  autoload :SourcesManager,            'cocoapods/sources_manager'

  # 描述pods target
  autoload :Target,                    'cocoapods/target'

  # 检查一个specification是否合法
  autoload :Validator,                 'cocoapods/validator'
```
可见cocoapods文件其实已经将cocoapods包含的功能描述的清清楚楚了，下面我们就选几个比较重要的模块进行简单的分析。

## Installer
首先我们来看看，当我们执行pod install的时候，到底是干了什么.
```ruby
def install!
  prepare  # 做一些准备工作
  resolve_dependencies   # 解析依赖关系
  download_dependencies    # 下载依赖库
  determine_dependency_product_types   # 查看依赖是静态库还是动态库
  verify_no_duplicate_framework_names    # 检查是否有重复framework
  verify_no_static_framework_transitive_dependencies   # 检查是否静态库有传递依赖
  verify_framework_usage # 检查framework的使用，主要跟swift相关
  generate_pods_project # 生成pods项目文件
  integrate_user_project if installation_options.integrate_targets?  # 集成用户项目文件
  perform_post_install_actions # 执行install后处理
end
```

我们使用cocoaPods的时候写的podfile就会在解析依赖关系的时候被使用到。其核心代码如下：
```ruby
def resolve_dependencies
  analyzer = create_analyzer # 创建分析器

  plugin_sources = run_source_provider_hooks
  analyzer.sources.insert(0, *plugin_sources)

  UI.section 'Updating local specs repositories' do
    analyzer.update_repositories # 这里是依赖解析的核心功能，用于下载和更新相关的依赖库
  end unless config.skip_repo_update?

  UI.section 'Analyzing dependencies' do
    analyze(analyzer)
    validate_build_configurations
    clean_sandbox
  end
end
```

接下来看看如何将下载下来的依赖库整合进目标工程。也就是generate_pods_project函数
```ruby
def generate_pods_project
  UI.section 'Generating Pods project' do
    prepare_pods_project        # 做一些准备工作,比如新建project、设置platform以及deployment_target等
    install_file_references  # 整合源文件和资源到Pods项目中
    install_libraries # 构建pod_targets和aggregate_targets
    set_target_dependencies # 增加每个aggregate目标的目标依赖，并将这个目标link在一起
    run_podfile_post_install_hooks # 执行hooks
    write_pod_project # 生成pod project文件
    share_development_pod_schemes
    write_lockfiles # 更新Podfile和PodLockfile
  end
end

 # FileReferencesInstaller
def install!
  refresh_file_accessors     # 从文件系统中读取文件
  add_source_files_references # 将源文件加到Pods项目中
  add_frameworks_bundles # 将framework加到Pods项目中
  add_vendored_libraries # 将库加到Pods项目中
  add_resources # 将资源加到Pods项目中
  link_headers # 创建头文件的链接
end

```

## Command
pod提供了一系列命令行，供用户使用。
```shell
Usage:

    $ pod COMMAND

      CocoaPods, the Cocoa library package manager.

Commands:

    + cache      Manipulate the CocoaPods cache
    + init       Generate a Podfile for the current directory.
    + install    Install project dependencies to Podfile.lock versions
    + ipc        Inter-process communication
    + lib        Develop pods
    + list       List pods
    + outdated   Show outdated project dependencies
    + plugins    Show available CocoaPods plugins
    + repo       Manage spec-repositories
    + search     Search for pods.
    + setup      Setup the CocoaPods environment
    + spec       Manage pod specs
    + trunk      Interact with the CocoaPods API (e.g. publishing new specs)
    + try        Try a Pod!
    + update     Update outdated project dependencies and create new Podfile.lock

Options:

    --silent     Show nothing
    --version    Show the version of the tool
    --verbose    Show more debugging information
    --no-ansi    Show output without ANSI codes
    --help       Show help banner of specified command
```
这些命令绝大部分都在cocoapods/command目录下。其实现基本是一样的，下面简单的拿pod install 来作为示例解析。执行pod install --help可以看到如下输出
```shell
Usage:

    $ pod install

      Downloads all dependencies defined in `Podfile` and creates an Xcode Pods
      library project in `./Pods`.

      The Xcode project file should be specified in your `Podfile` like this:

          xcodeproj 'path/to/XcodeProject'

      If no xcodeproj is specified, then a search for an Xcode project will be made.
      If more than one Xcode project is found, the command will raise an error.

      This will configure the project to reference the Pods static library, add a
      build configuration file, and add a post build script to copy Pod resources.

Options:

    --project-directory=/project/dir/   The path to the root of the project directory
    --no-clean                          Leave SCM dirs like `.git` and `.svn` intact
                                        after downloading
    --no-integrate                      Skip integration of the Pods libraries in the
                                        Xcode project(s)
    --no-repo-update                    Skip running `pod repo update` before install
    --silent                            Show nothing
    --verbose                           Show more debugging information
    --no-ansi                           Show output without ANSI codes
    --help                              Show help banner of specified command
```
cocoapods中所有的command都是继承自[CLAide::Command](https://github.com/CocoaPods/CLAide), CLAide是是ruby下的命令行工具，其提供了参数解析和命令执行功能。
```ruby
module Project
  module Options
    def options
      [
        ['--no-repo-update', 'Skip running `pod repo update` before install'],
      ].concat(super)
    end
  end

  def self.included(base)
    base.extend Options
  end

  def initialize(argv)
    config.skip_repo_update = !argv.flag?('repo-update', !config.skip_repo_update)
    super
  end

  # Runs the installer.
  #
  # @param  [Hash, Boolean, nil] update
  #         Pods that have been requested to be updated or true if all Pods
  #         should be updated
  #
  # @return [void]
  #
  def run_install_with_update(update)
    installer = Installer.new(config.sandbox, config.podfile, config.lockfile)
    installer.update = update
    installer.install!
  end
end


class Install < Command
  include Project

  self.summary = 'Install project dependencies to Podfile.lock versions'

  self.description = <<-DESC
    Downloads all dependencies defined in `Podfile` and creates an Xcode
    Pods library project in `./Pods`.

    The Xcode project file should be specified in your `Podfile` like this:

        xcodeproj 'path/to/XcodeProject'

    If no xcodeproj is specified, then a search for an Xcode project will
    be made. If more than one Xcode project is found, the command will
    raise an error.

    This will configure the project to reference the Pods static library,
    add a build configuration file, and add a post build script to copy
    Pod resources.
  DESC

  def run
    verify_podfile_exists!
    run_install_with_update(false)
  end
end

def run_install_with_update(update)
  installer = Installer.new(config.sandbox, config.podfile, config.lockfile)
  installer.update = update
  installer.install!
end
```

可以发现self.summary定义提供pod --help的简要描述，而self.description则定义了pod install --help的详细定义，options则是由self.options决定的。这里就不再详述了。当执行pod install的时候，实际执行的函数是run，即更新依赖并安装。

# 总结
上述分析只是简单的分析了CocoaPods的代码结构，熟悉CocoaPods的工作原理，熟悉ruby的代码规范，为以后解析CocoaPods代码细节提供基础，仅此而已。





