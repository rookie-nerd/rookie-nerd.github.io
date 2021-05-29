## Mach-O文件格式简析
macOS和iOS系统的可执行文件、库以及对象代码都是Mach-O格式的，Mach-O在macOS、iOS中的地位就相当于Linux系统中的[ELF](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format)。

Mach-O文件格式如下：

![Mach-O文件格式](~/Desktop/xcode9/mach-o-file-format.png)

Mach-O文件包含文件头(Header)、加载命令(Load Commands)、数据(Data)，而数据是分段(Segment)分部分(Section)的存放的。otool(具体用法请man otool)是苹果提供的分析Mach-O文件的工具，我们使用该工具来简单分析Mach-O文件的格式。

### Header
首先来看看文件头包含哪些信息。

```shell
# otool -h [file]
Mach header
      magic cputype cpusubtype  caps    filetype ncmds sizeofcmds      flags
 0xfeedfacf 16777223          3  0x00           2    21       2776 0x00200085
```

文件头中包含目标架构信息(cputype/cpusubtype)，文件类型(filetype)，加载命令信息(ncmds/sizeofcmds)，以及标识特定可选特征的flag。

### Load Commands
加载命令是Mach-O中比较有意思的部分，不仅指明了文件的逻辑结构，也确定了文件在虚拟内存中的布局。

```shell
# otool -l [file]
Load command 0
  cmd LC_SEGMENT_64
  cmdsize 72
  segname __PAGEZERO
   vmaddr 0x0000000000000000
   vmsize 0x0000000100000000
  fileoff 0
 filesize 0
  maxprot 0x00000000
 initprot 0x00000000
   nsects 0
    flags 0x0
```

cmd标识了加载命令的类型，加载类型比较多，包括`LC_SEGMENT`、`LC_LOAD_DYLIB`等。

### Segment && Section
程序都是按照Segment和Section存放在Mach-O文件中，一般访问他们也是按照Segment和Section的名字来访问他们。

```shell
# otool -s __TEXT __text [file]
DesymNonCrashStack:
Contents of (__TEXT,__text) section
00000001000013c0  55 48 89 e5 53 48 81 ec b8 00 00 00 48 8d 45 d8 
00000001000013d0  48 89 7d f0 48 89 75 e8 48 8b 75 f0 48 89 75 d8 
00000001000013e0  48 8b 35 d1 29 00 00 48 89 75 e0 48 8b 35 86 29 
00000001000013f0  00 00 48 89 c7 e8 4e 05 00 00 e8 25 05 00 00 89
```

示例展示了`__TEXT`段下`__text`的内容，也就是我们常说的可执行机器代码。

常用的Mach-O段包括

+ __PAGEZERO: 可执行文件的第一个段，可不要小看了这个段
+ __TEXT：包含可执行代码和其他只读数据
+ __DATA：包含可写的数据
+ __OBJC：包含被OC语言运行时使用的数据
+ __IMPORT：符号桩和不在可执行文件的指向符号的指针
+ __LINKEDIT：包含被动态链接器使用的原始数据