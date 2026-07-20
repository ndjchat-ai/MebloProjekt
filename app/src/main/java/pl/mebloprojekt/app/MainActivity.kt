package pl.mebloprojekt.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import pl.mebloprojekt.core.BackType
import pl.mebloprojekt.core.CabinetCalculation
import pl.mebloprojekt.core.CabinetCalculator
import pl.mebloprojekt.core.CabinetSpec
import pl.mebloprojekt.core.FrontMount
import pl.mebloprojekt.core.HorizontalAssembly
import pl.mebloprojekt.core.MaterialSpec

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MaterialTheme {
                MebloProjektApp()
            }
        }
    }
}

enum class Screen {
    PROJECTS,
    WIZARD,
    EDITOR,
    SUMMARY
}

data class SavedProject(
    val name: String,
    val calculation: CabinetCalculation
)

class AppViewModel : ViewModel() {

    var screen by mutableStateOf(Screen.PROJECTS)

    var currentCalculation by mutableStateOf<CabinetCalculation?>(null)

    val projects = mutableStateListOf<SavedProject>()

    fun create(spec: CabinetSpec) {
        currentCalculation = CabinetCalculator.calculate(spec)
        screen = Screen.EDITOR
    }

    fun saveCurrent() {
        val value = currentCalculation ?: return

        projects.removeAll {
            it.name == value.spec.name
        }

        projects += SavedProject(
            name = value.spec.name,
            calculation = value
        )
    }

    fun open(project: SavedProject) {
        currentCalculation = project.calculation
        screen = Screen.EDITOR
    }

    fun updateCompartments(values: List<Int>) {
        val current = currentCalculation ?: return

        currentCalculation = CabinetCalculator.calculate(
            current.spec.copy(
                customCompartmentHeightsMm = values
            )
        )
    }
}

@Composable
private fun MebloProjektApp(
    vm: AppViewModel = viewModel()
) {
    when (vm.screen) {
        Screen.PROJECTS -> ProjectsScreen(vm)
        Screen.WIZARD -> WizardScreen(vm)
        Screen.EDITOR -> EditorScreen(vm)
        Screen.SUMMARY -> SummaryScreen(vm)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProjectsScreen(vm: AppViewModel) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text("MebloProjekt")
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    vm.screen = Screen.WIZARD
                }
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Nowy projekt"
                )
            }
        }
    ) { padding ->

        if (vm.projects.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.Inventory2,
                    contentDescription = null,
                    modifier = Modifier.size(56.dp)
                )

                Spacer(
                    modifier = Modifier.height(16.dp)
                )

                Text(
                    text = "Nie masz jeszcze projektów",
                    style = MaterialTheme.typography.titleLarge
                )

                Text(
                    text = "Utwórz pierwszą szafkę z kreatora."
                )

                Spacer(
                    modifier = Modifier.height(20.dp)
                )

                Button(
                    onClick = {
                        vm.screen = Screen.WIZARD
                    }
                ) {
                    Text("Nowy projekt")
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(vm.projects) { project ->

                    Card(
                        onClick = {
                            vm.open(project)
                        }
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                        ) {
                            Text(
                                text = project.name,
                                fontWeight = FontWeight.Bold
                            )

                            Text(
                                text = "${project.calculation.spec.widthMm} × " +
                                    "${project.calculation.spec.heightMm} × " +
                                    "${project.calculation.spec.depthMm} mm"
                            )

                            Text(
                                text = "${project.calculation.parts.sumOf { it.quantity }} formatek"
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WizardScreen(vm: AppViewModel) {
    var name by remember {
        mutableStateOf("Szafka 1")
    }

    var width by remember {
        mutableStateOf("600")
    }

    var height by remember {
        mutableStateOf("720")
    }

    var depth by remember {
        mutableStateOf("280")
    }

    var thickness by remember {
        mutableStateOf("18")
    }

    var shelves by remember {
        mutableStateOf("3")
    }

    var doors by remember {
        mutableStateOf("2")
    }

    var assembly by remember {
        mutableStateOf(HorizontalAssembly.BETWEEN_SIDES)
    }

    var frontMount by remember {
        mutableStateOf(FrontMount.OVERLAY)
    }

    var backType by remember {
        mutableStateOf(BackType.HDF)
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text("Kreator szafki")
                },
                navigationIcon = {
                    IconButton(
                        onClick = {
                            vm.screen = Screen.PROJECTS
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Wróć"
                        )
                    }
                }
            )
        }
    ) { padding ->

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = name,
                onValueChange = {
                    name = it
                },
                label = {
                    Text("Nazwa")
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                NumberField(
                    label = "Szer.",
                    value = width,
                    onValueChange = {
                        width = it
                    },
                    modifier = Modifier.weight(1f)
                )

                NumberField(
                    label = "Wys.",
                    value = height,
                    onValueChange = {
                        height = it
                    },
                    modifier = Modifier.weight(1f)
                )

                NumberField(
                    label = "Gł.",
                    value = depth,
                    onValueChange = {
                        depth = it
                    },
                    modifier = Modifier.weight(1f)
                )
            }

            Text(
                text = "Wymiary dotyczą samego korpusu, bez frontu.",
                style = MaterialTheme.typography.bodySmall
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                NumberField(
                    label = "Płyta",
                    value = thickness,
                    onValueChange = {
                        thickness = it
                    },
                    modifier = Modifier.weight(1f)
                )

                NumberField(
                    label = "Półki",
                    value = shelves,
                    onValueChange = {
                        shelves = it
                    },
                    modifier = Modifier.weight(1f)
                )

                NumberField(
                    label = "Drzwi",
                    value = doors,
                    onValueChange = {
                        doors = it
                    },
                    modifier = Modifier.weight(1f)
                )
            }

            ChoiceSection(
                title = "Góra i dno"
            ) {
                ChoiceButton(
                    text = "Między bokami",
                    selected = assembly == HorizontalAssembly.BETWEEN_SIDES,
                    onClick = {
                        assembly = HorizontalAssembly.BETWEEN_SIDES
                    }
                )

                ChoiceButton(
                    text = "Na zewnątrz boków",
                    selected = assembly == HorizontalAssembly.OUTSIDE_SIDES,
                    onClick = {
                        assembly = HorizontalAssembly.OUTSIDE_SIDES
                    }
                )
            }

            ChoiceSection(
                title = "Front"
            ) {
                ChoiceButton(
                    text = "Nakładany",
                    selected = frontMount == FrontMount.OVERLAY,
                    onClick = {
                        frontMount = FrontMount.OVERLAY
                    }
                )

                ChoiceButton(
                    text = "Wpuszczany",
                    selected = frontMount == FrontMount.INSET,
                    onClick = {
                        frontMount = FrontMount.INSET
                    }
                )
            }

            ChoiceSection(
                title = "Plecy"
            ) {
                ChoiceButton(
                    text = "HDF / plecówka",
                    selected = backType == BackType.HDF,
                    onClick = {
                        backType = BackType.HDF
                    }
                )

                ChoiceButton(
                    text = "Płyta",
                    selected = backType == BackType.BOARD,
                    onClick = {
                        backType = BackType.BOARD
                    }
                )

                ChoiceButton(
                    text = "Bez pleców",
                    selected = backType == BackType.NONE,
                    onClick = {
                        backType = BackType.NONE
                    }
                )
            }

            Button(
                onClick = {
                    val boardThickness = thickness
                        .toIntOrNull()
                        ?.coerceAtLeast(1)
                        ?: 18

                    val board = MaterialSpec(
                        id = "board-main",
                        name = "Płyta korpusu",
                        thicknessMm = boardThickness
                    )

                    vm.create(
                        CabinetSpec(
                            name = name.ifBlank {
                                "Szafka"
                            },
                            widthMm = width
                                .toIntOrNull()
                                ?.coerceAtLeast(1)
                                ?: 600,
                            heightMm = height
                                .toIntOrNull()
                                ?.coerceAtLeast(1)
                                ?: 720,
                            depthMm = depth
                                .toIntOrNull()
                                ?.coerceAtLeast(1)
                                ?: 280,
                            boardMaterial = board,
                            frontMaterial = board,
                            shelfCount = shelves
                                .toIntOrNull()
                                ?.coerceAtLeast(0)
                                ?: 0,
                            doorCount = doors
                                .toIntOrNull()
                                ?.coerceAtLeast(0)
                                ?: 0,
                            horizontalAssembly = assembly,
                            frontMount = frontMount,
                            backType = backType
                        )
                    )
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Utwórz szafkę")
            }
        }
    }
}

@Composable
private fun NumberField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = { newValue ->
            onValueChange(
                newValue.filter {
                    it.isDigit()
                }
            )
        },
        label = {
            Text("$label (mm)")
        },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Number
        ),
        singleLine = true,
        modifier = modifier
    )
}

@Composable
private fun ChoiceSection(
    title: String,
    content: @Composable RowScope.() -> Unit
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(
            text = title,
            fontWeight = FontWeight.SemiBold
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            content = content
        )
    }
}

@Composable
private fun ChoiceButton(
    text: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    if (selected) {
        Button(
            onClick = onClick
        ) {
            Text(text)
        }
    } else {
        OutlinedButton(
            onClick = onClick
        ) {
            Text(text)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditorScreen(vm: AppViewModel) {
    val calculation = vm.currentCalculation ?: return

    var doorsOpen by remember {
        mutableStateOf(false)
    }

    var showDimensions by remember {
        mutableStateOf(true)
    }

    var editedCompartments by remember(
        calculation.spec.shelfCount,
        calculation.compartmentHeightsMm
    ) {
        mutableStateOf(
            calculation.compartmentHeightsMm.map {
                it.toString()
            }
        )
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(calculation.spec.name)
                },
                navigationIcon = {
                    IconButton(
                        onClick = {
                            vm.screen = Screen.PROJECTS
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Wróć"
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            vm.screen = Screen.SUMMARY
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Inventory2,
                            contentDescription = "Formatki"
                        )
                    }
                }
            )
        }
    ) { padding ->

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Drzwi otwarte")

                Spacer(
                    modifier = Modifier.width(8.dp)
                )

                Switch(
                    checked = doorsOpen,
                    onCheckedChange = {
                        doorsOpen = it
                    }
                )

                Spacer(
                    modifier = Modifier.weight(1f)
                )

                Text("Wymiary")

                Spacer(
                    modifier = Modifier.width(8.dp)
                )

                Switch(
                    checked = showDimensions,
                    onCheckedChange = {
                        showDimensions = it
                    }
                )
            }

            CabinetPreview(
                calculation = calculation,
                doorsOpen = doorsOpen,
                showDimensions = showDimensions
            )

            Text(
                text = "Korpus: ${calculation.spec.widthMm} × " +
                    "${calculation.spec.heightMm} × " +
                    "${calculation.spec.depthMm} mm",
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "Głębokość całkowita z frontem: " +
                    "${calculation.totalDepthIncludingFrontMm} mm"
            )

            Text(
                text = "Głębokość półek: ${calculation.shelfDepthMm} mm"
            )

            if (calculation.warnings.isNotEmpty()) {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        calculation.warnings.forEach { warning ->

                            Row(
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(
                                    imageVector = if (warning.isBlocking) {
                                        Icons.Default.Close
                                    } else {
                                        Icons.Default.Visibility
                                    },
                                    contentDescription = null
                                )

                                Spacer(
                                    modifier = Modifier.width(8.dp)
                                )

                                Text(
                                    text = warning.message
                                )
                            }
                        }
                    }
                }
            }

            Text(
                text = "Wysokości komór",
                style = MaterialTheme.typography.titleMedium
            )

            Text(
                text = "Możesz wpisać nierówne wysokości. " +
                    "Program sprawdzi ich sumę."
            )

            editedCompartments.forEachIndexed { index, value ->

                OutlinedTextField(
                    value = value,
                    onValueChange = { newValue ->
                        editedCompartments =
                            editedCompartments
                                .toMutableList()
                                .also { values ->
                                    values[index] =
                                        newValue.filter {
                                            it.isDigit()
                                        }
                                }
                    },
                    label = {
                        Text("Komora ${index + 1} (mm)")
                    },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number
                    ),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            OutlinedButton(
                onClick = {
                    vm.updateCompartments(
                        editedCompartments.map {
                            it.toIntOrNull() ?: 0
                        }
                    )
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null
                )

                Spacer(
                    modifier = Modifier.width(8.dp)
                )

                Text("Przelicz półki")
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        vm.saveCurrent()
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Zapisz")
                }

                OutlinedButton(
                    onClick = {
                        vm.screen = Screen.SUMMARY
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Formatki")
                }
            }
        }
    }
}

@Composable
private fun CabinetPreview(
    calculation: CabinetCalculation,
    doorsOpen: Boolean,
    showDimensions: Boolean
) {
    val spec = calculation.spec

    Card {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(360.dp)
                    .background(
                        color = Color(0xFFF7F7F7),
                        shape = RoundedCornerShape(8.dp)
                    )
            ) {
                val pad = 34f

                val safeWidth = spec.widthMm.coerceAtLeast(1)
                val safeHeight = spec.heightMm.coerceAtLeast(1)

                val scale = minOf(
                    (size.width - 2 * pad) / safeWidth,
                    (size.height - 2 * pad) / safeHeight
                )

                val cabinetWidth = safeWidth * scale
                val cabinetHeight = safeHeight * scale

                val x = (size.width - cabinetWidth) / 2
                val y = (size.height - cabinetHeight) / 2

                val thickness =
                    spec.boardMaterial.thicknessMm
                        .coerceAtLeast(1) * scale

                drawRect(
                    color = Color(0xFFE0C9A6),
                    topLeft = Offset(x, y),
                    size = Size(
                        width = cabinetWidth,
                        height = cabinetHeight
                    )
                )

                drawRect(
                    color = Color(0xFFF7F7F7),
                    topLeft = Offset(
                        x = x + thickness,
                        y = y + thickness
                    ),
                    size = Size(
                        width = (cabinetWidth - 2 * thickness)
                            .coerceAtLeast(0f),
                        height = (cabinetHeight - 2 * thickness)
                            .coerceAtLeast(0f)
                    )
                )

                drawRect(
                    color = Color.DarkGray,
                    topLeft = Offset(x, y),
                    size = Size(
                        width = cabinetWidth,
                        height = cabinetHeight
                    ),
                    style = Stroke(2f)
                )

                var currentY =
                    y + cabinetHeight - thickness

                calculation.compartmentHeightsMm
                    .dropLast(1)
                    .forEach { opening ->

                        currentY -= opening * scale

                        drawLine(
                            color = Color(0xFF765B3A),
                            start = Offset(
                                x = x + thickness,
                                y = currentY
                            ),
                            end = Offset(
                                x = x + cabinetWidth - thickness,
                                y = currentY
                            ),
                            strokeWidth = thickness.coerceAtLeast(4f)
                        )

                        currentY -= thickness
                    }

                if (spec.doorCount > 0) {
                    if (!doorsOpen) {
                        val gap =
                            spec.frontClearances.betweenDoorsMm * scale

                        val doorWidth =
                            (
                                cabinetWidth -
                                    gap * (spec.doorCount - 1)
                                ) / spec.doorCount

                        repeat(spec.doorCount) { index ->
                            val doorX =
                                x + index * (doorWidth + gap)

                            drawRect(
                                color = Color(0xFFD6B989),
                                topLeft = Offset(
                                    x = doorX,
                                    y = y
                                ),
                                size = Size(
                                    width = doorWidth,
                                    height = cabinetHeight
                                )
                            )

                            drawRect(
                                color = Color(0xFF6E5434),
                                topLeft = Offset(
                                    x = doorX,
                                    y = y
                                ),
                                size = Size(
                                    width = doorWidth,
                                    height = cabinetHeight
                                ),
                                style = Stroke(2f)
                            )
                        }
                    } else {
                        val leaf =
                            (
                                cabinetWidth / spec.doorCount
                                ).coerceAtLeast(18f)

                        drawLine(
                            color = Color(0xFF6E5434),
                            start = Offset(x, y),
                            end = Offset(
                                x = x - leaf * 0.35f,
                                y = y + cabinetHeight * 0.15f
                            ),
                            strokeWidth = 5f
                        )

                        drawLine(
                            color = Color(0xFF6E5434),
                            start = Offset(
                                x = x,
                                y = y + cabinetHeight
                            ),
                            end = Offset(
                                x = x - leaf * 0.35f,
                                y = y + cabinetHeight * 0.85f
                            ),
                            strokeWidth = 5f
                        )

                        if (spec.doorCount > 1) {
                            drawLine(
                                color = Color(0xFF6E5434),
                                start = Offset(
                                    x = x + cabinetWidth,
                                    y = y
                                ),
                                end = Offset(
                                    x = x + cabinetWidth +
                                        leaf * 0.35f,
                                    y = y +
                                        cabinetHeight * 0.15f
                                ),
                                strokeWidth = 5f
                            )

                            drawLine(
                                color = Color(0xFF6E5434),
                                start = Offset(
                                    x = x + cabinetWidth,
                                    y = y + cabinetHeight
                                ),
                                end = Offset(
                                    x = x + cabinetWidth +
                                        leaf * 0.35f,
                                    y = y +
                                        cabinetHeight * 0.85f
                                ),
                                strokeWidth = 5f
                            )
                        }
                    }
                }

                if (showDimensions) {
                    drawLine(
                        color = Color.Gray,
                        start = Offset(
                            x = x,
                            y = y - 14f
                        ),
                        end = Offset(
                            x = x + cabinetWidth,
                            y = y - 14f
                        ),
                        strokeWidth = 2f
                    )

                    drawLine(
                        color = Color.Gray,
                        start = Offset(
                            x = x - 14f,
                            y = y
                        ),
                        end = Offset(
                            x = x - 14f,
                            y = y + cabinetHeight
                        ),
                        strokeWidth = 2f
                    )
                }
            }

            if (showDimensions) {
                Text(
                    text = "Szerokość ${spec.widthMm} mm  •  " +
                        "Wysokość ${spec.heightMm} mm  •  " +
                        "Głębokość korpusu ${spec.depthMm} mm",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(
                        top = 8.dp
                    )
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SummaryScreen(vm: AppViewModel) {
    val calculation = vm.currentCalculation ?: return

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text("Formatki")
                },
                navigationIcon = {
                    IconButton(
                        onClick = {
                            vm.screen = Screen.EDITOR
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Wróć"
                        )
                    }
                }
            )
        }
    ) { padding ->

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                Text(
                    text = "Wymiary bazowe do zamówienia",
                    style = MaterialTheme.typography.titleLarge
                )

                Text(
                    text = "Wycięcia wykonywane później nie zmieniają " +
                        "wymiaru formatki."
                )
            }

            items(calculation.parts) { part ->

                Card {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Row {
                            Text(
                                text = part.name,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )

                            Text(
                                text = "${part.quantity} szt."
                            )
                        }

                        Text(
                            text = "${part.widthMm} × " +
                                "${part.heightMm} × " +
                                "${part.thicknessMm} mm"
                        )

                        Text(
                            text = part.material.name
                        )

                        if (part.material.grainMatters) {
                            Text(
                                text = "Kierunek dekoru ma znaczenie"
                            )
                        }

                        if (part.edgeBanding.isNotEmpty()) {
                            Text(
                                text = "Okleina: " +
                                    part.edgeBanding.entries.joinToString {
                                        "${it.key.name.lowercase()} " +
                                            "${it.value.thicknessMm} mm"
                                    }
                            )
                        }

                        part.notes.forEach { note ->
                            Text(
                                text = note,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        part.postProductionCuts.forEach { cut ->
                            Text(
                                text = "Obróbka własna: ${cut.description}"
                            )
                        }
                    }
                }
            }
        }
    }
}
